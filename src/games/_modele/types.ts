// TYPES propres au jeu : données de la grille (D), état du joueur (E), actions (A).
// Toujours déclarés avec « type » (et non « interface ») pour rester compatibles Json.
//
// Le jeu modèle : une ligne de TAILLE cases à remplir avec les chiffres 1 à TAILLE,
// chacun une seule fois. Assez simple pour montrer le contrat sans logique de jeu.

export const TAILLE = 6;

/** D : l'énoncé et sa solution. */
export type DonneesModele = {
  /** Chiffres donnés au départ (0 = case à remplir). */
  readonly donnes: readonly number[];
  readonly solution: readonly number[];
};

/** E : ce que le joueur a saisi. */
export type EtatModele = {
  /** Chiffre de chaque case (0 = vide) ; les cases données gardent leur chiffre. */
  readonly valeurs: readonly number[];
  /** Notes (petits chiffres candidats) de chaque case, triées. */
  readonly notes: readonly (readonly number[])[];
};

/** A : une action du joueur. Union « discriminée » par le champ type. */
export type ActionModele =
  | { readonly type: 'placer'; readonly cellule: number; readonly valeur: number }
  | { readonly type: 'noter'; readonly cellule: number; readonly valeur: number }
  | { readonly type: 'effacer'; readonly cellule: number };
