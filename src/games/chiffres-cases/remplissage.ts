// REMPLISSAGE des chiffres d'une grille de chiffres casés (génération). Code pur.
//
// Aucun dictionnaire n'est nécessaire : n'importe quels chiffres conviennent, pourvu qu'aucun nombre
// ne commence par 0 et que tous les nombres soient différents.
// « favoris » : pour rendre la grille plus ambiguë (niveaux difficiles), une part des cases est tirée
// parmi quelques chiffres favoris ; les nombres de même longueur se ressemblent alors davantage.

import type { Alea } from '../../types/alea.ts';
import { nombreDe, type Grille } from './grille.ts';
import { NOIRE } from './types.ts';

export type ParametresRemplissage = {
  /** Nombre de chiffres favoris (0 = tirage uniforme). */
  readonly favoris: number;
  /** Probabilité de tirer une case parmi les favoris. */
  readonly partFavoris: number;
};

const ESSAIS_REPARATION = 200;

/** Chiffres de la solution (NOIRE pour une case noire), ou null si les nombres n'ont pas pu être rendus distincts. */
export function remplir(grille: Grille, params: ParametresRemplissage, alea: Alea): number[] | null {
  const premieres = new Set(grille.emplacements.map((e) => e.cellules[0] ?? -1));
  const favoris = alea.melanger([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).slice(0, params.favoris);
  const favorisNonNuls = favoris.filter((v) => v !== 0);

  const tirer = (cellule: number, uniforme: boolean): number => {
    const tete = premieres.has(cellule);
    if (!uniforme && favoris.length > 0 && alea.suivant() < params.partFavoris) {
      const choix = tete ? favorisNonNuls : favoris;
      if (choix.length > 0) return choix[alea.entier(choix.length)] ?? 1;
    }
    return tete ? 1 + alea.entier(9) : alea.entier(10);
  };

  const chiffres = grille.noires.map((noire, c) => (noire ? NOIRE : tirer(c, false)));

  // Réparation des doublons : une case du second nombre est tirée à nouveau (uniformément)
  for (let essai = 0; essai < ESSAIS_REPARATION; essai++) {
    const vus = new Map<string, number>();
    let doublon = -1;
    for (const e of grille.emplacements) {
      const n = nombreDe(e, chiffres);
      if (vus.has(n)) {
        doublon = e.id;
        break;
      }
      vus.set(n, e.id);
    }
    if (doublon < 0) return chiffres;
    const cellules = grille.emplacements[doublon]?.cellules ?? [];
    const c = cellules[alea.entier(cellules.length)] ?? 0;
    chiffres[c] = tirer(c, true);
  }
  return null;
}
