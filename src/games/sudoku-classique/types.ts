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

/** Nouvelles notes d'une case (action « definir-notes »). */
export type NotesCase = {
  readonly cellule: number;
  /** Notes triées, sans doublon. */
  readonly notes: readonly number[];
};

/**
 * A : une action du joueur.
 * - placer : pose un chiffre et retire ce chiffre des notes de la ligne, de la colonne et du bloc ;
 * - placer-seul : pose un chiffre sans toucher aux notes des autres cases (réglage « retrait
 *   automatique des notes » désactivé). Le choix est inscrit dans l'action : rejouer l'historique
 *   donne toujours le même résultat, même si le réglage change ensuite ;
 * - noter : ajoute ou retire une note ;
 * - effacer : vide la case (chiffre et notes) ;
 * - definir-notes : remplace les notes de plusieurs cases vides d'un coup (éliminations d'un indice) :
 *   une seule action, donc un seul « Annuler ». L'ancien bouton « Remplir les notes » (retiré) la
 *   produisait aussi : les parties sauvegardées qui en contiennent restent lisibles et rejouables.
 */
export type ActionSudoku =
  | { readonly type: 'placer'; readonly cellule: number; readonly valeur: number }
  | { readonly type: 'placer-seul'; readonly cellule: number; readonly valeur: number }
  | { readonly type: 'noter'; readonly cellule: number; readonly valeur: number }
  | { readonly type: 'effacer'; readonly cellule: number }
  | { readonly type: 'definir-notes'; readonly changements: readonly NotesCase[] };
