// MÉTADONNÉES du Tectonic : ce qu'affichent l'accueil et la fiche du jeu, et ses réglages propres.
// Code pur.

import type { MetaJeu, ReglageJeu } from '../../types/jeu.ts';
import { NIVEAUX } from '../../types/niveaux.ts';

/** Poser un chiffre le retire des notes de sa zone et des cases qui touchent la case. */
export const RETRAIT_AUTO_NOTES: ReglageJeu = {
  id: 'retraitAutoNotes',
  type: 'interrupteur',
  libelle: 'Retrait automatique des notes',
  detail: 'Poser un chiffre le retire des notes de sa zone et des cases qui la touchent.',
  defaut: true,
  preparation: false,
};

export const META: MetaJeu = {
  id: 'tectonic',
  nom: 'Tectonic',
  description: 'Chaque zone de N cases reçoit les chiffres 1 à N, et deux cases qui se touchent ont toujours des chiffres différents.',
  niveaux: NIVEAUX,
  versionFormat: 1,
  // Difficile : 0,8 s en moyenne sur PC mais jusqu'à 5 s (25 s sur tablette) ; Expert (9 × 9) et
  // Diabolique (10 × 10) : environ 2 s en moyenne, jusqu'à 8 s. Le pack sert quand la réserve est vide,
  // la réserve est réalimentée en arrière-plan avec un budget plus long (validé à l'étape 7a).
  generation: {
    difficile: { mode: 'worker', budgetFondMs: 30_000 },
    expert: { mode: 'worker', budgetFondMs: 60_000 },
    diabolique: { mode: 'worker', budgetFondMs: 60_000 },
  },
  reglages: [RETRAIT_AUTO_NOTES],
};
