// Grilles de référence pour les tests du moteur.

/** Convertit une chaîne de chiffres (0 = vide) en tableau. */
export function lire(chaine: string): number[] {
  return [...chaine].map(Number);
}

/** Sudoku classique à solution unique (exemple très répandu) et sa solution. */
export const ENONCE_UNIQUE = lire(
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
);
export const SOLUTION_UNIQUE = lire(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
);

/** Grille réputée très difficile pour les humains, à solution unique. */
export const ENONCE_DIFFICILE = lire(
  '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
);
