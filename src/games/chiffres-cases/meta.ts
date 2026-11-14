// MÉTADONNÉES des chiffres casés : ce qu'affiche l'écran d'accueil. Code pur.

import type { MetaJeu } from '../../types/jeu.ts';
import { NIVEAUX } from '../../types/niveaux.ts';

export const META: MetaJeu = {
  id: 'chiffres-cases',
  nom: 'Chiffres casés',
  description: 'Placer chaque nombre de la liste une seule fois dans la grille, comme des mots croisés.',
  niveaux: NIVEAUX,
  versionFormat: 1,
  // Diabolique : plusieurs secondes à plusieurs dizaines de secondes de génération sur PC, jamais
  // dans le budget d'une tablette : servi par son pack. Expert : ~0,7 s en moyenne sur PC (1,7 s au
  // pire), soit 2 à 8 s sur tablette : le pack sert d'abord, la réserve est réalimentée avec 30 s.
  generation: {
    expert: { mode: 'worker', budgetFondMs: 30_000 },
    diabolique: { mode: 'pack' },
  },
};
