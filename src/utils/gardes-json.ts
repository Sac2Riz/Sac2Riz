// Petites fonctions de vérification de données JSON venant de l'extérieur
// (sauvegarde, fichier importé, message du worker). Code pur.
// Elles servent à écrire les gardes estDonnees / estEtat / estAction des jeux.

import type { Json, JsonObjet } from '../types/json.ts';

/** Vrai si la valeur est un objet JSON (ni null, ni tableau). */
export function estObjet(valeur: unknown): valeur is JsonObjet {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

/** Vrai si la valeur est un entier compris entre min et max (inclus). */
export function estEntierEntre(valeur: unknown, min: number, max: number): valeur is number {
  return typeof valeur === 'number' && Number.isInteger(valeur) && valeur >= min && valeur <= max;
}

/** Vrai si la valeur est un tableau dont chaque élément passe la garde fournie. */
export function estTableauDe<T extends Json>(
  valeur: unknown,
  garde: (element: unknown) => element is T,
): valeur is readonly T[] {
  return Array.isArray(valeur) && valeur.every((element) => garde(element));
}
