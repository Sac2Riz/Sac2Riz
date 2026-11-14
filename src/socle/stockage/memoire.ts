// Stockage EN MÉMOIRE : même comportement que la version IndexedDB, pour les tests sous Node.
// Les valeurs sont copiées à l'écriture et à la lecture (structuredClone), comme IndexedDB :
// modifier un objet après l'avoir écrit ne change pas ce qui est stocké.

import { migrer } from './schema.ts';
import type { DonneesExportees } from '../../types/sauvegarde.ts';
import {
  ecrituresDonnees,
  GARDES,
  MAGASINS_EXPORTES,
  type ContenuMagasins,
  type Entree,
  type NomMagasin,
  type Stockage,
} from './stockage.ts';

/** Contenu brut : magasin → (clé → valeur). Exposé pour que les tests puissent l'abîmer exprès. */
export type DonneesBrutes = Map<string, Map<string, unknown>>;

export type StockageMemoire = Stockage & { readonly brut: DonneesBrutes; readonly version: number };

/**
 * Crée un stockage vide, au schéma actuel (toutes les migrations appliquées depuis 0).
 * baseNeuve : ce que le stockage annonce (faux pour simuler une base créée par une version précédente).
 */
export function creerStockageMemoire(baseNeuve = true): StockageMemoire {
  const brut: DonneesBrutes = new Map();
  const version = migrer(
    {
      creerMagasin: (nom) => {
        if (brut.has(nom)) throw new Error(`Magasin déjà existant : ${nom}`);
        brut.set(nom, new Map());
      },
      supprimerMagasin: (nom) => {
        brut.delete(nom);
      },
      magasins: () => [...brut.keys()],
    },
    0,
  );
  let ferme = false;

  function magasin(nom: NomMagasin): Map<string, unknown> {
    if (ferme) throw new Error('Stockage fermé');
    const m = brut.get(nom);
    if (m === undefined) throw new Error(`Magasin inconnu : ${nom}`);
    return m;
  }

  /** Clés commençant par le préfixe, triées comme IndexedDB (ordre des codes UTF-16). */
  function clesTriees(m: Map<string, unknown>, prefixe: string): string[] {
    return [...m.keys()].filter((cle) => cle.startsWith(prefixe)).sort();
  }

  function entreesValides<M extends NomMagasin>(nom: M, prefixe: string): Entree<M>[] {
    const m = magasin(nom);
    const garde = GARDES[nom];
    const resultat: Entree<M>[] = [];
    for (const cle of clesTriees(m, prefixe)) {
      const valeur = m.get(cle);
      if (garde(valeur)) resultat.push({ cle, valeur: structuredClone(valeur) });
    }
    return resultat;
  }

  return {
    baseNeuve,
    brut,
    version,
    async lire<M extends NomMagasin>(nom: M, cle: string): Promise<ContenuMagasins[M] | null> {
      const valeur = magasin(nom).get(cle);
      return GARDES[nom](valeur) ? structuredClone(valeur) : null;
    },
    async ecrire<M extends NomMagasin>(nom: M, cle: string, valeur: ContenuMagasins[M]): Promise<void> {
      magasin(nom).set(cle, structuredClone(valeur));
    },
    async supprimer(nom: NomMagasin, cle: string): Promise<void> {
      magasin(nom).delete(cle);
    },
    async lister<M extends NomMagasin>(nom: M, prefixe: string): Promise<readonly Entree<M>[]> {
      return entreesValides(nom, prefixe);
    },
    async compter(nom: NomMagasin, prefixe: string): Promise<number> {
      return entreesValides(nom, prefixe).length;
    },
    // Atomique : tout se fait sans « await », donc sans qu'un autre appel puisse s'intercaler
    async prendrePremier<M extends NomMagasin>(nom: M, prefixe: string): Promise<Entree<M> | null> {
      const m = magasin(nom);
      const garde = GARDES[nom];
      for (const cle of clesTriees(m, prefixe)) {
        const valeur = m.get(cle);
        m.delete(cle);
        if (garde(valeur)) return { cle, valeur };
      }
      return null;
    },
    // Atomique : tout est préparé avant de toucher aux magasins, puis remplacé sans « await »
    async remplacerDonnees(donnees: DonneesExportees): Promise<void> {
      const nouveaux = new Map<string, Map<string, unknown>>(MAGASINS_EXPORTES.map((nom) => [nom, new Map()]));
      for (const { magasin: nom, cle, valeur } of ecrituresDonnees(donnees)) {
        nouveaux.get(nom)?.set(cle, structuredClone(valeur));
      }
      for (const nom of MAGASINS_EXPORTES) magasin(nom); // erreur si fermé, avant toute modification
      for (const [nom, contenu] of nouveaux) brut.set(nom, contenu);
    },
    fermer(): void {
      ferme = true;
    },
  };
}
