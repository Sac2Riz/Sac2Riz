// OUTILS de l'écran de partie : lesquels afficher, selon ce que le jeu masque (VueJeu.outilsMasques).
// Code pur (testé sous Node) ; ecran-partie.ts s'en sert pour construire la barre d'outils.

import type { OutilMasquable } from '../types/vue.ts';

/** Tous les outils du socle, dans l'ordre d'affichage. */
export const OUTILS = ['notes', 'effacer', 'annuler', 'retablir', 'indice'] as const;
export type Outil = (typeof OUTILS)[number];

/** Outils affichés : tous, sauf ceux que le jeu masque (Annuler et Rétablir ne se masquent pas). */
export function outilsAffiches(masques: readonly OutilMasquable[]): Outil[] {
  const caches = new Set<string>(masques);
  return OUTILS.filter((o) => !caches.has(o));
}
