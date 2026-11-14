// MÉTADONNÉES des chiffres casés : ce qu'affichent l'accueil et la fiche du jeu, et ses réglages
// propres. Code pur.

import type { MetaJeu, ReglageJeu } from '../../types/jeu.ts';
import { NIVEAUX } from '../../types/niveaux.ts';

/** Une nouvelle grille sans nombre pré-placé en reçoit un (LogiqueJeu.preparer, voir depart.ts). */
export const NOMBRE_AU_DEPART: ReglageJeu = {
  id: 'nombreAuDepart',
  type: 'interrupteur',
  libelle: 'Toujours placer un nombre au départ',
  detail: 'Une nouvelle grille sans nombre donné en reçoit un, choisi pour aider à démarrer.',
  defaut: false,
  preparation: true,
};

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
  reglages: [NOMBRE_AU_DEPART],
};
