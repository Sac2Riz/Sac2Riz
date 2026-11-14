// MÉTADONNÉES du sudoku classique : ce qu'affichent l'accueil et la fiche du jeu, et ses réglages
// propres. Code pur.

import type { MetaJeu, ReglageJeu } from '../../types/jeu.ts';
import { NIVEAUX } from '../../types/niveaux.ts';

/** Poser un chiffre le retire des notes des cases qui voient la case (actions « placer » / « placer-seul »). */
export const RETRAIT_AUTO_NOTES: ReglageJeu = {
  id: 'retraitAutoNotes',
  type: 'interrupteur',
  libelle: 'Retrait automatique des notes',
  detail: 'Poser un chiffre le retire des notes de sa ligne, de sa colonne et de son bloc.',
  defaut: true,
  preparation: false,
};

export const META: MetaJeu = {
  id: 'sudoku-classique',
  nom: 'Sudoku',
  description: 'La grille classique 9 × 9 : chaque chiffre de 1 à 9 une seule fois par ligne, par colonne et par bloc.',
  niveaux: NIVEAUX,
  versionFormat: 1,
  generation: {},
  reglages: [RETRAIT_AUTO_NOTES],
};
