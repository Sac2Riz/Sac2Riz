// LISTE ORDONNÉE des techniques du solveur des chiffres casés (de la plus simple à la plus dure).
// L'ordre doit suivre IDS_TECHNIQUES_CASES (vérifié par les tests).

import type { TechniqueCases } from '../technique.ts';
import { consequence } from './consequence.ts';
import { croisementComplet } from './croisement-complet.ts';
import { croisementEtendu } from './croisement-etendu.ts';
import { croisement } from './croisement.ts';
import { forcing } from './forcing.ts';
import { groupeCache } from './groupe-cache.ts';
import { groupeNu } from './groupe-nu.ts';
import { longueurUnique } from './longueur-unique.ts';
import { motifUnique } from './motif-unique.ts';
import { placeUnique } from './place-unique.ts';

export const TECHNIQUES_CASES: readonly TechniqueCases[] = [
  longueurUnique,
  motifUnique,
  placeUnique,
  croisement,
  groupeNu,
  groupeCache,
  croisementEtendu,
  croisementComplet,
  consequence,
  forcing,
];
