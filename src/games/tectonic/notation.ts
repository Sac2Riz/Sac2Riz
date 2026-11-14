// NOTATION du Tectonic : niveau + force 1-10, avec le score du moteur (mesurerNotation, calculerForce)
// et des seuils propres au jeu. Voir docs/DIFFICULTE.md. Code pur.

import type { Contexte } from '../../moteur/logique/contexte.ts';
import { resoudreLogique } from '../../moteur/logique/solveur.ts';
import { noterEtapes, type SeuilsForce } from '../../moteur/notation.ts';
import type { ValeursGrille } from '../../types/grille.ts';
import type { ResultatLogique } from '../../types/logique.ts';
import type { Niveau, Notation } from '../../types/niveaux.ts';
import { IDS_TECHNIQUES_TECTONIC, TECHNIQUES_TECTONIC } from './techniques.ts';

/**
 * Version de la notation du Tectonic. À INCRÉMENTER dès qu'un seuil, une technique ou l'ordre des
 * techniques change (puis régénérer les packs du jeu s'il en a).
 */
export const VERSION_NOTATION_TECTONIC = 1;

/**
 * Seuils de force (force haute si score ≥ score OU chiffres donnés ≤ indices), validés à l'étape 7a
 * (100 grilles par niveau ; environ une grille sur deux en force haute, voir docs/DIFFICULTE.md).
 * Débutant : le score (≈ nombre de cases vides) ne distingue pas les grilles, seuls les chiffres donnés.
 * Toute modification impose d'incrémenter VERSION_NOTATION_TECTONIC.
 */
export const SEUILS_FORCE_TECTONIC: SeuilsForce = {
  debutant: { score: null, indices: 13 },
  facile: { score: 6, indices: 12 },
  moyen: { score: 4, indices: 6 },
  difficile: { score: 5, indices: 7 },
};

/** Résolution logique avec les techniques du Tectonic (jusqu'au niveau donné). */
export function resoudreTectonic(ctx: Contexte, enonce: ValeursGrille, niveauMax: Niveau = 'diabolique'): ResultatLogique {
  return resoudreLogique(ctx, enonce, { niveauMax, techniques: TECHNIQUES_TECTONIC });
}

/** Notation d'une grille déjà résolue (résultat du solveur fourni). */
export function noterResultat(
  enonce: ValeursGrille,
  resultat: ResultatLogique,
  seuils: SeuilsForce = SEUILS_FORCE_TECTONIC,
): Notation {
  return noterEtapes(enonce, resultat.etapes, seuils, IDS_TECHNIQUES_TECTONIC);
}

/** Note une grille (0 = case vide) ; null si la logique seule ne la résout pas (grille rejetée). */
export function noterTectonic(ctx: Contexte, enonce: ValeursGrille, seuils: SeuilsForce = SEUILS_FORCE_TECTONIC): Notation | null {
  const resultat = resoudreTectonic(ctx, enonce);
  return resultat.statut === 'resolu' ? noterResultat(enonce, resultat, seuils) : null;
}
