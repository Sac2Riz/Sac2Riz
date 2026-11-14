// Techniques génériques qui ne font pas partie de la liste du sudoku (étape 7a, Tectonic).
// Chaque jeu compose sa propre liste ordonnée avec celles de TECHNIQUES (index.ts) et celles-ci. Code pur.

import type { Technique } from '../technique.ts';
import { paireNueEtendue } from './paire-nue-etendue.ts';
import { singletonCacheZone } from './singleton-cache-zone.ts';
import { voisineCommuneEtendue } from './voisine-commune-etendue.ts';
import { voisineCommune } from './voisine-commune.ts';

/** Même ordre que IDS_TECHNIQUES_COMPLEMENTAIRES (vérifié par les tests). */
export const TECHNIQUES_COMPLEMENTAIRES: readonly Technique[] = [
  singletonCacheZone,
  voisineCommune,
  voisineCommuneEtendue,
  paireNueEtendue,
];
