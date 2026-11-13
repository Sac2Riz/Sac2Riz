// TYPES du sudoku classique : données de la grille (D), état du joueur (E), actions (A).
// Déclarés avec « type » (compatibles Json), sans propriété optionnelle.

/** Côté de la grille et nombre de cases. */
export const TAILLE = 9;
export const NOMBRE_CASES = TAILLE * TAILLE;

/** D : l'énoncé et sa solution, case par case (ligne par ligne, de 0 à 80). */
export type DonneesSudoku = {
  /** Chiffres donnés au départ (0 = case à remplir). */
  readonly enonce: readonly number[];
  readonly solution: readonly number[];
};

/** E : ce que le joueur a saisi. */
export type EtatSudoku = {
  /** Chiffre de chaque case (0 = vide) ; les cases données gardent leur chiffre. */
  readonly valeurs: readonly number[];
  /** Notes (petits chiffres candidats) de chaque case, triées ; vides pour une case remplie. */
  readonly notes: readonly (readonly number[])[];
};

/**
 * A : une action du joueur.
 * - placer : pose un chiffre (et retire ce chiffre des notes de la ligne, de la colonne et du bloc) ;
 * - noter : ajoute ou retire une note ;
 * - effacer : vide la case (chiffre et notes).
 */
export type ActionSudoku =
  | { readonly type: 'placer'; readonly cellule: number; readonly valeur: number }
  | { readonly type: 'noter'; readonly cellule: number; readonly valeur: number }
  | { readonly type: 'effacer'; readonly cellule: number };
