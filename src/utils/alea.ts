// Générateur pseudo-aléatoire à graine (algorithme « mulberry32 » : court, rapide,
// largement suffisant pour mélanger des grilles). Code pur.

import type { Alea } from '../types/alea.ts';

/** Crée un générateur : la même graine produit toujours la même suite de nombres. */
export function creerAlea(graine: number): Alea {
  // État interne sur 32 bits non signés (« >>> 0 » force cette représentation)
  let etat = graine >>> 0;

  function suivant(): number {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function entier(max: number): number {
    return Math.floor(suivant() * max);
  }

  function melanger<T>(tableau: readonly T[]): T[] {
    const copie = [...tableau];
    // Mélange de Fisher-Yates
    for (let i = copie.length - 1; i > 0; i--) {
      const j = entier(i + 1);
      // Les « ! » sont sûrs : i et j sont toujours dans les bornes du tableau
      const temporaire = copie[i]!;
      copie[i] = copie[j]!;
      copie[j] = temporaire;
    }
    return copie;
  }

  return { suivant, entier, melanger };
}

/** Graine imprévisible pour une nouvelle partie. */
export function graineAleatoire(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
