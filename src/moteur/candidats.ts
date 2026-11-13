// Opérations sur les candidats représentés en masques de bits (type Candidats).
// Le bit (v - 1) vaut 1 si la valeur v est possible : {1, 3} = 0b101.
// Les opérateurs binaires & (et), | (ou), ~ (non) testent ou retirent des candidats
// en une seule instruction, ce qui rend les solveurs très rapides. Code pur.

import type { Candidats } from '../types/grille.ts';

/** Plus grande valeur représentable (les opérateurs binaires de JavaScript travaillent sur 32 bits). */
export const VALEUR_MAX = 31;

/** Masque ne contenant que la valeur v (v entre 1 et 31). */
export function masqueDe(valeur: number): Candidats {
  return 1 << (valeur - 1);
}

/** Masque contenant toutes les valeurs de la liste. */
export function masqueComplet(valeurs: readonly number[]): Candidats {
  let masque = 0;
  for (const v of valeurs) masque |= masqueDe(v);
  return masque;
}

/** Vrai si la valeur v fait partie des candidats. */
export function contient(masque: Candidats, valeur: number): boolean {
  return (masque & masqueDe(valeur)) !== 0;
}

/** Nombre de candidats (nombre de bits à 1). */
export function compterBits(masque: Candidats): number {
  // Méthode classique « SWAR » : additionne les bits par paquets, sans boucle
  let x = masque >>> 0;
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return Math.imul(x, 0x01010101) >>> 24;
}

/** Plus petite valeur présente dans le masque, ou 0 si le masque est vide. */
export function plusPetiteValeur(masque: Candidats): number {
  if (masque === 0) return 0;
  // masque & -masque isole le bit à 1 le plus bas ; clz32 compte les zéros à gauche
  return 32 - Math.clz32(masque & -masque);
}

/** Liste croissante des valeurs présentes dans le masque. */
export function valeursDuMasque(masque: Candidats): number[] {
  const valeurs: number[] = [];
  let reste = masque;
  while (reste !== 0) {
    const bas = reste & -reste;
    valeurs.push(32 - Math.clz32(bas));
    reste ^= bas;
  }
  return valeurs;
}
