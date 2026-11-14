// Types communs des techniques du solveur des chiffres casés. Code pur.
// Même principe que le solveur du sudoku (src/moteur/logique/) : une technique cherche la première
// occurrence UTILE de son motif et la renvoie sous forme d'« étape » expliquée, ou null.

import type { Niveau } from '../../../types/niveaux.ts';
import type { Probleme } from '../probleme.ts';
import type { EliminationSolveur, EtatSolveur, PlacementSolveur } from './etat.ts';

/** Identifiants des techniques, dans l'ordre où le solveur les essaie. */
export const IDS_TECHNIQUES_CASES = [
  // Débutant
  'longueur-unique',
  'motif-unique',
  // Facile
  'place-unique',
  // Moyen
  'croisement',
  // Difficile
  'groupe-nu',
  'groupe-cache',
  'croisement-etendu',
  // Expert
  'croisement-complet',
  // Diabolique
  'consequence',
  'forcing',
] as const;

export type IdTechniqueCases = (typeof IDS_TECHNIQUES_CASES)[number];

/** Ce qu'une technique a trouvé (JSON : sert aussi aux indices expliqués). */
export type EtapeCases = {
  readonly technique: IdTechniqueCases;
  readonly niveau: Niveau;
  /** Emplacements du motif (ceux qui justifient la déduction). */
  readonly motif: readonly number[];
  readonly placements: readonly PlacementSolveur[];
  readonly eliminations: readonly EliminationSolveur[];
  readonly explication: string;
};

export type TechniqueCases = {
  readonly id: IdTechniqueCases;
  readonly niveau: Niveau;
  /** Nom affiché (indices, écran de fin). */
  readonly nom: string;
  chercher(p: Probleme, etat: EtatSolveur): EtapeCases | null;
};

/**
 * Construit une étape en ne gardant que les effets RÉELS (placement dans un emplacement vide,
 * élimination d'un candidat encore présent) ; null s'il ne reste rien.
 */
export function construireEtape(
  technique: Pick<TechniqueCases, 'id' | 'niveau'>,
  etat: EtatSolveur,
  motif: readonly number[],
  placements: readonly PlacementSolveur[],
  eliminations: readonly EliminationSolveur[],
  explication: string,
): EtapeCases | null {
  const utiles = placements.filter((pl) => (etat.affectes[pl.emplacement] ?? -1) < 0);
  const retraits = eliminations.flatMap(({ emplacement, nombres }) => {
    if ((etat.affectes[emplacement] ?? -1) >= 0) return [];
    const presents = nombres.filter((n) => etat.candidats[emplacement]?.includes(n) === true);
    return presents.length > 0 ? [{ emplacement, nombres: presents }] : [];
  });
  if (utiles.length === 0 && retraits.length === 0) return null;
  return {
    technique: technique.id,
    niveau: technique.niveau,
    motif,
    placements: utiles,
    eliminations: retraits,
    explication,
  };
}

/** « 12, 34 et 56 » (ou « 12, 34 ou 56 »). */
export function enumerer(elements: readonly string[], liaison: 'et' | 'ou' = 'et'): string {
  if (elements.length <= 1) return elements.join('');
  return `${elements.slice(0, -1).join(', ')} ${liaison} ${elements[elements.length - 1] ?? ''}`;
}

/** Textes des nombres d'une liste d'indices. */
export function textes(p: Probleme, nombres: readonly number[]): string[] {
  return nombres.map((n) => p.nombres[n] ?? '?');
}

/** Combinaisons de k éléments (ordre conservé). */
export function combinaisons<T>(elements: readonly T[], k: number): T[][] {
  const resultat: T[][] = [];
  const courante: T[] = [];
  const parcourir = (debut: number): void => {
    if (courante.length === k) {
      resultat.push([...courante]);
      return;
    }
    for (let i = debut; i <= elements.length - (k - courante.length); i++) {
      courante.push(elements[i] as T); // i est dans les bornes (boucle)
      parcourir(i + 1);
      courante.pop();
    }
  };
  parcourir(0);
  return resultat;
}

/**
 * Chiffres déjà écrits dans un emplacement par les nombres qui le croisent, ex. « 3·4· »
 * (« · » = case encore vide) ; null si aucun chiffre n'est écrit.
 */
export function motifEcrit(p: Probleme, etat: EtatSolveur, emplacement: number): string | null {
  const e = p.grille.emplacements[emplacement];
  if (e === undefined) return null;
  let connu = false;
  const texte = e.cellules
    .map((cellule) => {
      const cr = (p.grille.croisements[emplacement] ?? []).find((c) => c.cellule === cellule);
      const n = cr === undefined ? -1 : (etat.affectes[cr.autre] ?? -1);
      if (n < 0 || cr === undefined) return '·';
      connu = true;
      return String(p.chiffres[n]?.[cr.positionAutre] ?? '?');
    })
    .join('');
  return connu ? texte : null;
}
