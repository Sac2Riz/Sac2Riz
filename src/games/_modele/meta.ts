// MÉTADONNÉES du jeu : ce qu'affichent l'accueil et la fiche du jeu, et ses réglages propres. Code pur.
// En copiant le modèle : changer id (= nom du dossier), nom et description.

import type { MetaJeu } from '../../types/jeu.ts';
import { NIVEAUX } from '../../types/niveaux.ts';

export const META: MetaJeu = {
  id: '_modele',
  nom: 'Modèle',
  description: 'Compléter une ligne avec les chiffres de 1 à 6, chacun une seule fois.',
  niveaux: NIVEAUX,
  versionFormat: 1,
  generation: {},
  // Réglages propres au jeu, affichés par le socle dans sa section ([] = aucun).
  // Exemple : sudoku-classique/meta.ts (RETRAIT_AUTO_NOTES).
  reglages: [],
};
