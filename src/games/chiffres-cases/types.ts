// TYPES des chiffres casés : données de la grille (D), état du joueur (E), actions (A).
// Déclarés avec « type » (compatibles Json), sans propriété optionnelle.
//
// Vocabulaire :
// - case noire / case blanche ;
// - EMPLACEMENT : suite d'au moins 2 cases blanches consécutives (horizontale ou verticale),
//   bornée par le bord ou une case noire ; chacun reçoit un nombre de la liste ;
// - LISTE : tous les nombres de la solution (un par emplacement), tous différents, aucun ne
//   commençant par 0, regroupés par longueur.
// Les emplacements et la liste se DÉDUISENT de la grille (grille.ts) : ils ne sont pas stockés.

/** Valeur d'une case noire dans DonneesCases.solution. */
export const NOIRE = -1;

/** Dimensions acceptées (garde des données). */
export const COTE_MIN = 3;
export const COTE_MAX = 15;

/** Longueur minimale d'un emplacement. */
export const LONGUEUR_MIN = 2;

/** D : la grille résolue et les emplacements donnés au départ. */
export type DonneesCases = {
  readonly largeur: number;
  readonly hauteur: number;
  /** Case par case, ligne par ligne : NOIRE (−1) ou le chiffre de la solution (0 à 9). */
  readonly solution: readonly number[];
  /**
   * Numéros des emplacements pré-placés (triés, sans doublon). Numérotation : voir
   * emplacementsDe (grille.ts) — par première case dans l'ordre de lecture, l'horizontal d'abord.
   */
  readonly preplaces: readonly number[];
};

/** E : le nombre posé dans chaque emplacement (null = vide). Les pré-placés y figurent dès le départ. */
export type EtatCases = {
  readonly places: readonly (string | null)[];
};

/**
 * A : une action du joueur.
 * - placer : pose un nombre ENTIER de la liste dans un emplacement de même longueur.
 *   Si ce nombre était déjà posé ailleurs, il y est retiré (déplacement). S'il contredit un nombre
 *   croisé déjà posé, l'action est sans effet (voir consequencesPlacement dans regles.ts) ;
 * - effacer : vide un emplacement (jamais un pré-placé).
 */
export type ActionCases =
  | { readonly type: 'placer'; readonly emplacement: number; readonly nombre: string }
  | { readonly type: 'effacer'; readonly emplacement: number };
