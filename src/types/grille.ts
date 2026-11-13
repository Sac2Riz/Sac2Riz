// Types du moteur de contraintes générique (famille sudoku). Voir docs/ARCHITECTURE.md.
// Une grille = des cases + des régions typées. Une nouvelle variante de sudoku
// se résume idéalement à une nouvelle liste de régions.

/** Indice d'une case : ligne * nombreDeColonnes + colonne (0 = coin haut gauche). */
export type Cellule = number;

/** Valeurs des cases d'une grille, ligne par ligne ; 0 = case vide. */
export type ValeursGrille = readonly number[];

/** Formes possibles d'une région d'unicité (chaque valeur au plus une fois). */
export type FormeUnicite = 'ligne' | 'colonne' | 'bloc' | 'diagonale' | 'irreguliere';

/** Région où chaque valeur apparaît au plus une fois. */
export type RegionUnicite = {
  readonly type: 'unicite';
  readonly forme: FormeUnicite;
  readonly cellules: readonly Cellule[];
};

/** Région dont la somme des valeurs est imposée (cage de Killer, etc.). */
export type RegionSomme = {
  readonly type: 'somme';
  readonly forme: 'cage';
  readonly cellules: readonly Cellule[];
  readonly total: number;
  /**
   * Vrai si les valeurs de la cage doivent être toutes différentes (règle du Killer sudoku :
   * une cage de 8 sur deux cases accepte 1+7, 2+6, 3+5 mais pas 4+4). La fabrique cage() le met à vrai par défaut.
   */
  readonly distinctes: boolean;
};

export type Region = RegionUnicite | RegionSomme;

/** Description complète d'une grille pour le moteur de contraintes. */
export type DefinitionGrille = {
  readonly lignes: number;
  readonly colonnes: number;
  /** Valeurs autorisées dans les cases (ex. 1 à 9). */
  readonly valeurs: readonly number[];
  readonly regions: readonly Region[];
};

/**
 * Candidats d'une case sous forme de masque de bits :
 * le bit (v - 1) vaut 1 si la valeur v est encore possible.
 * Ex. 0b000000101 = candidats {1, 3}. Rapide et compact pour les solveurs.
 */
export type Candidats = number;
