// GÉNÉRATION d'une grille de Tectonic d'un niveau donné. Voir docs/DIFFICULTE.md. Code pur.
//
// Un essai = une grille pleine (zones et chiffres construits ensemble, construction.ts ; tentative
// refaite tant qu'elle échoue), puis le retrait des chiffres du moteur (retirerChiffres) piloté par
// la fonction d'acceptation, comme au sudoku :
//   - un retrait est refusé si la grille n'est plus résoluble avec les techniques du niveau ;
//   - arrêt tôt (niveaux faciles) quand le nombre de chiffres donnés atteint une cible tirée au hasard ;
//   - pas de symétrie (sans objet avec des zones irrégulières).
// Contrôle final : niveau exact. doitArreter() est consulté avant chaque tentative de construction.

import { retirerChiffres } from '../../moteur/generateur.ts';
import type { PlageIndices } from '../../moteur/generation-niveau.ts';
import type { Alea } from '../../types/alea.ts';
import type { Niveau, Notation } from '../../types/niveaux.ts';
import { construireGrille, type ParametresConstruction } from './construction.ts';
import { structureTectonic } from './grille.ts';
import { noterResultat, resoudreTectonic } from './notation.ts';
import type { DonneesTectonic } from './types.ts';

/** Réglages de génération d'un niveau. */
export type ParametresNiveau = ParametresConstruction & {
  /** Arrêt tôt du retrait (null = retrait jusqu'à une grille minimale). */
  readonly cibleIndices: PlageIndices | null;
};

/** Poids des tailles de zone visées (1 à tailleMax cases) : jamais 1, les grandes zones favorisées. */
export function poidsTailles(tailleMax: number): number[] {
  return Array.from({ length: tailleMax }, (_, i) => [0, 1, 2, 4, 6, 6][i] ?? 6);
}

/** Réglages communs, pour une grille carrée de côté donné. */
export function parametresGrille(cote: number, tailleMax: number, cibleIndices: PlageIndices | null): ParametresNiveau {
  return {
    lignes: cote,
    colonnes: cote,
    tailleMax,
    poids: poidsTailles(tailleMax),
    probaNouvelle: 0.1,
    probaManquant: 0.8,
    unitairesMax: cote <= 7 ? 1 : 2,
    noeudsMax: 5_000,
    cibleIndices,
  };
}

/**
 * Réglages par niveau, validés par l'utilisateur à l'étape 7a (mesures dans docs/DIFFICULTE.md) :
 * zones de 5 cases au plus partout ; arrêt tôt de 12 à 15 chiffres donnés en Débutant et Facile.
 */
export const PARAMETRES_NIVEAUX: Readonly<Record<Niveau, ParametresNiveau>> = {
  debutant: parametresGrille(6, 5, { min: 12, max: 15 }),
  facile: parametresGrille(7, 5, { min: 12, max: 15 }),
  moyen: parametresGrille(8, 5, null),
  difficile: parametresGrille(8, 5, null),
  expert: parametresGrille(9, 5, null),
  diabolique: parametresGrille(10, 5, null),
};

export type OptionsGenerationTectonic = {
  /** Vrai = abandonner (budget épuisé). null : seule tentativesMax limite (bench, packs, tests). */
  readonly doitArreter: (() => boolean) | null;
  /** Nombre maximal d'essais complets ; null = illimité (doitArreter obligatoire). */
  readonly tentativesMax: number | null;
  /** Réglages du niveau (par défaut PARAMETRES_NIVEAUX) : le bench en essaie d'autres. */
  readonly parametres: ParametresNiveau | null;
};

/** Compteurs utiles aux mesures (bench). */
export type CompteursGeneration = {
  /** Essais complets (grille pleine puis retrait des chiffres). */
  readonly essais: number;
  /** Tentatives de construction d'une grille pleine qui ont échoué. */
  readonly constructionsRatees: number;
};

export type ResultatGenerationTectonic =
  | ({ readonly ok: true; readonly donnees: DonneesTectonic; readonly notation: Notation } & CompteursGeneration)
  | ({ readonly ok: false; readonly raison: string } & CompteursGeneration);

/** Limite d'essais quand aucun budget de temps n'est fourni. */
export const TENTATIVES_MAX_SANS_BUDGET = 200;

/** Génère une grille exactement du niveau demandé, ou échoue (budget ou limite d'essais). */
export function genererTectonic(
  niveau: Niveau,
  alea: Alea,
  options: Partial<OptionsGenerationTectonic> = {},
): ResultatGenerationTectonic {
  const doitArreter = options.doitArreter ?? null;
  const tentativesMax =
    options.tentativesMax !== undefined ? options.tentativesMax : doitArreter !== null ? null : TENTATIVES_MAX_SANS_BUDGET;
  if (tentativesMax === null && doitArreter === null) {
    throw new Error("genererTectonic : sans limite d'essais, un budget de temps (doitArreter) est obligatoire");
  }
  const p = options.parametres ?? PARAMETRES_NIVEAUX[niveau];
  let essais = 0;
  let constructionsRatees = 0;
  const compteurs = (): CompteursGeneration => ({ essais, constructionsRatees });
  let premiere = true;

  while (tentativesMax === null || essais < tentativesMax) {
    // Au moins une tentative, même si le budget est déjà épuisé
    if (!premiere && doitArreter !== null && doitArreter()) {
      return { ok: false, raison: `Budget de temps épuisé après ${essais} essais (niveau ${niveau})`, ...compteurs() };
    }
    premiere = false;
    const pleine = construireGrille(p, alea);
    if (pleine === null) {
      constructionsRatees++;
      continue;
    }
    essais++;
    const { zones, solution } = pleine;
    const structure = structureTectonic(p.lignes, p.colonnes, zones);
    const ctx = structure.contexte;
    const cible = p.cibleIndices === null ? 0 : p.cibleIndices.min + alea.entier(p.cibleIndices.max - p.cibleIndices.min + 1);
    const enonce = retirerChiffres(structure.definition, solution, alea, {
      symetrie: 'aucune',
      accepter: (etat) => {
        if (resoudreTectonic(ctx, etat.enonce, niveau).statut !== 'resolu') return 'refuser';
        return etat.nombreIndices <= cible ? 'arreter' : 'continuer';
      },
    });
    const resultat = resoudreTectonic(ctx, enonce);
    if (resultat.statut !== 'resolu') continue;
    const notation = noterResultat(enonce, resultat);
    if (notation.niveau !== niveau) continue;
    const donnees: DonneesTectonic = { lignes: p.lignes, colonnes: p.colonnes, zones, enonce, solution };
    return { ok: true, donnees, notation, ...compteurs() };
  }
  return { ok: false, raison: `Aucune grille de niveau ${niveau} en ${essais} essais`, ...compteurs() };
}
