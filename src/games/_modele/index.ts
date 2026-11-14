// POINT D'ENTRÉE du jeu, référencé par le registre (src/games/registre.ts).
// Il ne charge que les métadonnées ; logique, vue et fiche sont importées à la demande.

import type { ModuleJeu } from '../../types/vue.ts';
import { META } from './meta.ts';
import type { ActionModele, DonneesModele, EtatModele } from './types.ts';

export const jeu: ModuleJeu<DonneesModele, EtatModele, ActionModele> = {
  meta: META,
  chargerLogique: async () => (await import('./logique.ts')).logique,
  chargerVue: async () => (await import('./vue.ts')).vue,
  chargerFiche: async () => (await import('./fiche.ts')).fiche,
  // Pas de pack pour le modèle (un jeu qui en a : voir sudoku-classique/packs.ts)
  chargerPack: async () => null,
};
