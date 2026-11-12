// REGISTRE CENTRAL DES JEUX.
// Ajouter un jeu = créer son dossier src/games/<id>/ puis ajouter UNE ligne ci-dessous :
//   { id: '<id>', charger: () => import('./<id>/index.ts') },
// Le socle n'a jamais besoin d'être modifié. Voir docs/AJOUTER_UN_JEU.md.
// L'ordre de la liste est l'ordre d'affichage sur l'écran d'accueil.

import type { EntreeRegistre } from '../types/vue.ts';

export const REGISTRE: readonly EntreeRegistre[] = [
  // (aucun jeu pour l'instant : le sudoku classique arrive à l'étape 3)
];
