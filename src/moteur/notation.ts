// Notation de la difficulté d'une grille (famille sudoku) : niveau + force 1-10.
// Voir docs/DIFFICULTE.md. Code pur.
//
// - Niveau : celui de la technique la plus dure utilisée par le solveur logique.
// - Force  : Expert = 9, Diabolique = 10 ; pour les niveaux à deux valeurs (Débutant à Difficile),
//   la valeur haute est retenue si la grille est « dure pour son niveau » (voir estHaute).
// - Une grille que la logique ne résout pas (essai-erreur nécessaire) n'est pas notée : null.

import type { ValeursGrille } from '../types/grille.ts';
import { IDS_TECHNIQUES, type Etape, type IdTechnique } from '../types/logique.ts';
import { INFOS_NIVEAUX, NIVEAUX, type Force, type Niveau, type Notation } from '../types/niveaux.ts';
import type { Contexte } from './logique/contexte.ts';
import { resoudreLogique } from './logique/solveur.ts';

/**
 * Version de la notation. À INCRÉMENTER dès qu'un seuil, une technique ou l'ordre des techniques
 * change : les notations enregistrées (packs, sauvegardes) avec une autre version ne sont plus fiables.
 */
export const VERSION_NOTATION = 1;

/** Niveaux dont la plage de force a deux valeurs (basse / haute). */
export type NiveauADeuxForces = 'debutant' | 'facile' | 'moyen' | 'difficile';

/**
 * Seuils d'un niveau à deux valeurs : la force haute est retenue si
 * score ≥ score (critère ignoré si null) OU nombre de chiffres donnés ≤ indices.
 */
export type SeuilsNiveau = { readonly score: number | null; readonly indices: number };

export type SeuilsForce = Readonly<Record<NiveauADeuxForces, SeuilsNiveau>>;

/**
 * Seuils mesurés à l'étape 2b (sudoku 9x9, 200 grilles par niveau ; voir docs/DIFFICULTE.md) :
 * chacun donne environ la moitié des grilles en force haute.
 * Débutant : le score (≈ nombre de cases vides) ne dit rien de plus que les chiffres donnés.
 * Toute modification impose d'incrémenter VERSION_NOTATION.
 */
export const SEUILS_FORCE: SeuilsForce = {
  debutant: { score: null, indices: 39 },
  facile: { score: 4, indices: 30 },
  moyen: { score: 4, indices: 26 },
  difficile: { score: 3, indices: 26 },
};

/** Mesures qui servent à placer une grille dans la plage de force de son niveau. */
export type MesuresNotation = {
  /**
   * Étapes du niveau max + ½ × étapes du niveau juste en dessous, ce dernier n'étant compté
   * que s'il est au moins Moyen : les singletons (Débutant, Facile) sont les étapes de
   * « remplissage » de toute grille, ils ne disent rien de sa difficulté.
   */
  readonly score: number;
  /** Nombre de chiffres donnés. */
  readonly indices: number;
};

/** Rang du premier niveau dont les étapes comptent comme « niveau inférieur » dans le score. */
const RANG_MIN_NIVEAU_INFERIEUR = NIVEAUX.indexOf('moyen');

/** Niveau le plus élevé parmi les étapes (Débutant s'il n'y en a aucune). */
export function niveauDesEtapes(etapes: readonly Etape[]): Niveau {
  let rang = 0;
  for (const etape of etapes) rang = Math.max(rang, NIVEAUX.indexOf(etape.niveau));
  return NIVEAUX[rang] ?? 'debutant';
}

/** Calcule le score et le nombre de chiffres donnés d'une grille résolue au niveau donné. */
export function mesurerNotation(enonce: ValeursGrille, etapes: readonly Etape[], niveau: Niveau): MesuresNotation {
  const rang = NIVEAUX.indexOf(niveau);
  let score = 0;
  for (const etape of etapes) {
    const r = NIVEAUX.indexOf(etape.niveau);
    if (r === rang) score += 1;
    else if (r === rang - 1 && r >= RANG_MIN_NIVEAU_INFERIEUR) score += 0.5;
  }
  return { score, indices: enonce.filter((v) => v !== 0).length };
}

function estADeuxForces(niveau: Niveau): niveau is NiveauADeuxForces {
  return INFOS_NIVEAUX[niveau].forceMin !== INFOS_NIVEAUX[niveau].forceMax;
}

/** Vrai si la grille est « dure pour son niveau » d'après les seuils. */
function estHaute(mesures: MesuresNotation, seuils: SeuilsNiveau): boolean {
  return (seuils.score !== null && mesures.score >= seuils.score) || mesures.indices <= seuils.indices;
}

/** Force d'une grille d'après son niveau et ses mesures. */
export function calculerForce(niveau: Niveau, mesures: MesuresNotation, seuils: SeuilsForce = SEUILS_FORCE): Force {
  const { forceMin, forceMax } = INFOS_NIVEAUX[niveau];
  if (!estADeuxForces(niveau)) return forceMin;
  return estHaute(mesures, seuils[niveau]) ? forceMax : forceMin;
}

/** Nombre d'utilisations de chaque technique (seules les techniques utilisées apparaissent). */
function compterTechniques(etapes: readonly Etape[]): Record<string, number> {
  const details: Record<string, number> = {};
  for (const { technique } of etapes) details[technique] = (details[technique] ?? 0) + 1;
  return details;
}

/** Technique la plus avancée utilisée (la dernière dans l'ordre donné), ou 'aucune'. */
function techniqueLaPlusDure(etapes: readonly Etape[], ordre: readonly IdTechnique[]): string {
  let rang = -1;
  for (const { technique } of etapes) rang = Math.max(rang, ordre.indexOf(technique));
  return ordre[rang] ?? 'aucune';
}

/**
 * Note une grille déjà résolue par le solveur logique (étapes fournies).
 * `ordre` : identifiants des techniques du jeu, de la plus simple à la plus dure (celui du sudoku par
 * défaut) ; il sert à désigner la technique la plus dure (étape 7a).
 */
export function noterEtapes(
  enonce: ValeursGrille,
  etapes: readonly Etape[],
  seuils: SeuilsForce = SEUILS_FORCE,
  ordre: readonly IdTechnique[] = IDS_TECHNIQUES,
): Notation {
  const niveau = niveauDesEtapes(etapes);
  return {
    niveau,
    force: calculerForce(niveau, mesurerNotation(enonce, etapes, niveau), seuils),
    techniqueMax: techniqueLaPlusDure(etapes, ordre),
    details: compterTechniques(etapes),
  };
}

/** Note une grille (0 = case vide) ; null si la logique seule ne la résout pas. */
export function noterGrille(ctx: Contexte, enonce: ValeursGrille, seuils: SeuilsForce = SEUILS_FORCE): Notation | null {
  const resultat = resoudreLogique(ctx, enonce);
  if (resultat.statut !== 'resolu') return null;
  return noterEtapes(enonce, resultat.etapes, seuils);
}
