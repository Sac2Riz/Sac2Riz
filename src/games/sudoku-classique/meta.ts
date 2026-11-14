// MÉTADONNÉES du sudoku classique : ce qu'affiche l'écran d'accueil. Code pur.

import type { MetaJeu } from '../../types/jeu.ts';
import { NIVEAUX } from '../../types/niveaux.ts';

export const META: MetaJeu = {
  id: 'sudoku-classique',
  nom: 'Sudoku',
  description: 'La grille classique 9 × 9 : chaque chiffre de 1 à 9 une seule fois par ligne, par colonne et par bloc.',
  niveaux: NIVEAUX,
  versionFormat: 1,
  generation: {},
};
