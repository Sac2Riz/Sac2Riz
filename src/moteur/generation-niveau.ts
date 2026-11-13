// Génération d'une grille d'un niveau donné (famille sudoku). Voir docs/DIFFICULTE.md. Code pur.
//
// Un essai = une grille complète au hasard, puis retrait de chiffres piloté par la fonction
// d'acceptation de retirerChiffres :
//   - un retrait est refusé si la grille n'est plus résoluble avec les techniques du niveau
//     demandé (niveau dépassé, ou essai-erreur nécessaire) ;
//   - pour Débutant et Facile, le retrait s'arrête tôt dès qu'il reste assez peu de chiffres
//     donnés (on garde des grilles aérées, avec beaucoup de chiffres).
// Contrôle final : la grille obtenue doit être exactement du niveau demandé (pas plus facile),
// sinon on recommence, au plus tentativesMax fois, ou jusqu'à ce que doitArreter() réponde vrai
// (budget de temps fixé par le worker : le moteur, pur, ne lit jamais l'horloge lui-même).

import type { Alea } from '../types/alea.ts';
import type { DefinitionGrille } from '../types/grille.ts';
import type { Niveau, Notation } from '../types/niveaux.ts';
import { genererGrilleComplete, retirerChiffres, type Symetrie } from './generateur.ts';
import { creerContexteAvec } from './logique/contexte.ts';
import { resoudreLogique } from './logique/solveur.ts';
import { noterEtapes, SEUILS_FORCE, type SeuilsForce } from './notation.ts';
import { compiler } from './structure.ts';

/** Plage (bornes incluses) dans laquelle est tiré, à chaque essai, le nombre de chiffres donnés visé. */
export type PlageIndices = { readonly min: number; readonly max: number };

/**
 * Arrêt tôt : le retrait s'arrête dès que le nombre de chiffres donnés atteint la cible tirée
 * dans la plage (null = pas d'arrêt tôt, retrait jusqu'à une grille minimale). Tirer la cible
 * au hasard varie le nombre de chiffres donnés, et donc la force. Valeurs mesurées pour le 9x9
 * (81 cases) à l'étape 2b ; une grille Débutant ou Facile minimale n'aurait que ~28-29 chiffres.
 */
export const CIBLES_ARRET_TOT: Readonly<Record<Niveau, PlageIndices | null>> = {
  debutant: { min: 36, max: 44 },
  facile: { min: 30, max: 35 },
  moyen: null,
  difficile: null,
  expert: null,
  diabolique: null,
};

export type OptionsGenerationNiveau = {
  /** Nombre maximal d'essais (grille complète + retrait) avant d'abandonner. */
  readonly tentativesMax: number;
  readonly symetrie: Symetrie;
  /** Arrêt tôt (null = jamais). */
  readonly cibleIndices: PlageIndices | null;
  readonly seuils: SeuilsForce;
  /**
   * Consultée avant chaque essai sauf le premier : vrai = abandonner (budget de temps épuisé).
   * null = seul tentativesMax limite la génération.
   */
  readonly doitArreter: (() => boolean) | null;
};

export type ResultatGenerationNiveau =
  | {
      readonly ok: true;
      readonly enonce: number[];
      readonly solution: number[];
      readonly notation: Notation;
      /** Nombre d'essais utilisés (1 = réussi du premier coup). */
      readonly essais: number;
    }
  | { readonly ok: false; readonly raison: string; readonly essais: number };

/** Options par défaut pour un niveau (l'arrêt tôt dépend du niveau). */
export function optionsParDefaut(niveau: Niveau): OptionsGenerationNiveau {
  return {
    tentativesMax: 50,
    symetrie: 'centrale',
    cibleIndices: CIBLES_ARRET_TOT[niveau],
    seuils: SEUILS_FORCE,
    doitArreter: null,
  };
}

/** Génère une grille exactement du niveau demandé, ou échoue (tentativesMax atteint ou doitArreter). */
export function genererParNiveau(
  definition: DefinitionGrille,
  niveau: Niveau,
  alea: Alea,
  options: Partial<OptionsGenerationNiveau> = {},
): ResultatGenerationNiveau {
  const { tentativesMax, symetrie, cibleIndices, seuils, doitArreter } = { ...optionsParDefaut(niveau), ...options };
  const ctx = creerContexteAvec(compiler(definition));

  for (let essai = 1; essai <= tentativesMax; essai++) {
    // Au moins un essai, même si le budget est déjà épuisé
    if (essai > 1 && doitArreter !== null && doitArreter()) {
      return { ok: false, raison: `Budget de temps épuisé après ${essai - 1} essais (niveau ${niveau})`, essais: essai - 1 };
    }
    const solution = genererGrilleComplete(definition, alea);
    const cible = cibleIndices === null ? 0 : cibleIndices.min + alea.entier(cibleIndices.max - cibleIndices.min + 1);
    const enonce = retirerChiffres(definition, solution, alea, {
      symetrie,
      accepter: (etat) => {
        if (resoudreLogique(ctx, etat.enonce, { niveauMax: niveau }).statut !== 'resolu') return 'refuser';
        return etat.nombreIndices <= cible ? 'arreter' : 'continuer';
      },
    });
    // Contrôle final : niveau exact (le retrait garantit seulement « pas plus dur que demandé »)
    const resultat = resoudreLogique(ctx, enonce);
    if (resultat.statut !== 'resolu') continue;
    const notation = noterEtapes(enonce, resultat.etapes, seuils);
    if (notation.niveau === niveau) return { ok: true, enonce, solution, notation, essais: essai };
  }
  return { ok: false, raison: `Aucune grille de niveau ${niveau} en ${tentativesMax} essais`, essais: tentativesMax };
}
