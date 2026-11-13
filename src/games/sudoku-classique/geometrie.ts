// GÉOMÉTRIE de la grille 9 × 9 : ligne, colonne, bloc et cases « voisines » (qui se voient).
// Code pur, partagé par la logique (retrait des notes) et la vue (mises en évidence).

import { NOMBRE_CASES, TAILLE } from './types.ts';

/** Côté d'un bloc. */
const BLOC = 3;

export const ligneDe = (cellule: number): number => Math.floor(cellule / TAILLE);
export const colonneDe = (cellule: number): number => cellule % TAILLE;
/** Numéro du bloc (0 à 8, de gauche à droite puis de haut en bas). */
export const blocDe = (cellule: number): number =>
  Math.floor(ligneDe(cellule) / BLOC) * BLOC + Math.floor(colonneDe(cellule) / BLOC);

/** Vrai si les deux cases (différentes) partagent une ligne, une colonne ou un bloc. */
export function seVoient(a: number, b: number): boolean {
  return a !== b && (ligneDe(a) === ligneDe(b) || colonneDe(a) === colonneDe(b) || blocDe(a) === blocDe(b));
}

/** Pour chaque case, la liste des 20 cases qui la voient (calculée une fois). */
export const VOISINES: readonly (readonly number[])[] = Array.from({ length: NOMBRE_CASES }, (_, a) =>
  Array.from({ length: NOMBRE_CASES }, (_, b) => b).filter((b) => seVoient(a, b)),
);

/** Nom lisible d'une case : « L3C5 » (ligne 3, colonne 5, comptées à partir de 1). */
export function nomCase(cellule: number): string {
  return `L${ligneDe(cellule) + 1}C${colonneDe(cellule) + 1}`;
}
