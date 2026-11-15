// REGISTRE CENTRAL DES JEUX.
// Ajouter un jeu = créer son dossier src/games/<id>/ puis ajouter UNE ligne ci-dessous :
//   { id: '<id>', charger: () => import('./<id>/index.ts') },
// Le socle n'a jamais besoin d'être modifié. Voir docs/AJOUTER_UN_JEU.md.
// L'ordre de la liste est l'ordre d'affichage sur l'écran d'accueil.

import type { EntreeRegistre } from '../types/vue.ts';

export const REGISTRE: readonly EntreeRegistre[] = [
  { id: 'sudoku-classique', charger: () => import('./sudoku-classique/index.ts') },
  { id: 'chiffres-cases', charger: () => import('./chiffres-cases/index.ts') },
  { id: 'tectonic', charger: () => import('./tectonic/index.ts') },
];
