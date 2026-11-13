// POINT D'ENTRÉE du sudoku classique, référencé par le registre (src/games/registre.ts).
// Il ne charge que les métadonnées ; logique, vue et packs sont importés à la demande.

import type { ModuleJeu } from '../../types/vue.ts';
import { META } from './meta.ts';
import type { ActionSudoku, DonneesSudoku, EtatSudoku } from './types.ts';

export const jeu: ModuleJeu<DonneesSudoku, EtatSudoku, ActionSudoku> = {
  meta: META,
  chargerLogique: async () => (await import('./logique.ts')).logique,
  chargerVue: async () => (await import('./vue.ts')).vue,
  chargerPack: async (niveau) => (await import('./packs.ts')).chargerPack(niveau),
};
