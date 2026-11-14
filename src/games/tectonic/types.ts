// TYPES du Tectonic : données de la grille (D), état du joueur (E), actions (A).
// Déclarés avec « type » (compatibles Json), sans propriété optionnelle.

/** Côtés admis par les gardes (les niveaux utilisent 6 à 10). */
export const COTE_MIN = 2;
export const COTE_MAX = 12;
/** Plus grande zone admise par les gardes (5 en général, 6 en option aux niveaux élevés). */
export const TAILLE_ZONE_MAX = 6;

/**
 * D : la grille. Les zones sont données par une carte (numéro de zone de chaque case, ligne par
 * ligne), numérotées dans l'ordre de lecture de leur première case (0, 1, 2…). Une zone de N cases
 * contient les chiffres 1 à N ; deux cases qui se touchent (côté ou diagonale) n'ont jamais le même chiffre.
 */
export type DonneesTectonic = {
  readonly lignes: number;
  readonly colonnes: number;
  readonly zones: readonly number[];
  /** Chiffres donnés au départ (0 = case à remplir). */
  readonly enonce: readonly number[];
  readonly solution: readonly number[];
};

/** E : ce que le joueur a saisi (comme au sudoku). */
export type EtatTectonic = {
  /** Chiffre de chaque case (0 = vide) ; les cases données gardent leur chiffre. */
  readonly valeurs: readonly number[];
  /** Notes de chaque case, triées ; vides pour une case remplie. */
  readonly notes: readonly (readonly number[])[];
};

/** Nouvelles notes d'une case (action « definir-notes »). */
export type NotesCase = {
  readonly cellule: number;
  /** Notes triées, sans doublon. */
  readonly notes: readonly number[];
};

/**
 * A : une action du joueur (mêmes actions qu'au sudoku).
 * - placer : pose un chiffre et le retire des notes de la zone et des cases qui touchent la case ;
 * - placer-seul : pose un chiffre sans toucher aux autres notes (retrait automatique désactivé) ;
 * - noter : ajoute ou retire une note ;
 * - effacer : vide la case (chiffre et notes) ;
 * - definir-notes : remplace les notes de plusieurs cases vides d'un coup (éliminations d'un indice).
 */
export type ActionTectonic =
  | { readonly type: 'placer'; readonly cellule: number; readonly valeur: number }
  | { readonly type: 'placer-seul'; readonly cellule: number; readonly valeur: number }
  | { readonly type: 'noter'; readonly cellule: number; readonly valeur: number }
  | { readonly type: 'effacer'; readonly cellule: number }
  | { readonly type: 'definir-notes'; readonly changements: readonly NotesCase[] };
