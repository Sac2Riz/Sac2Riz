// POINT D'ENTRÉE du Tectonic, référencé par le registre (src/games/registre.ts).
// Il ne charge que les métadonnées ; logique, vue, fiche et packs sont importés à la demande.

import type { ModuleJeu } from '../../types/vue.ts';
import { META } from './meta.ts';
import type { ActionTectonic, DonneesTectonic, EtatTectonic } from './types.ts';

export const jeu: ModuleJeu<DonneesTectonic, EtatTectonic, ActionTectonic> = {
  meta: META,
  chargerLogique: async () => (await import('./logique.ts')).logique,
  chargerVue: async () => (await import('./vue.ts')).vue,
  chargerFiche: async () => (await import('./fiche.ts')).fiche,
  chargerPack: async (niveau) => (await import('./packs.ts')).chargerPack(niveau),
};
