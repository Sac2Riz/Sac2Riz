// Liste des techniques, dans l'ordre où le solveur les essaie : de la plus simple à la plus dure
// (même ordre que IDS_TECHNIQUES dans types/logique.ts ; vérifié par les tests). Code pur.

import type { IdTechnique } from '../../../types/logique.ts';
import type { Technique } from '../technique.ts';
import { deuxStringKite } from './2-string-kite.ts';
import { claiming } from './claiming.ts';
import { dernierChiffre } from './dernier-chiffre.ts';
import { forcingSimple } from './forcing-simple.ts';
import { paireCachee } from './paire-cachee.ts';
import { paireNue } from './paire-nue.ts';
import { pointing } from './pointing.ts';
import { quadrupletCache } from './quadruplet-cache.ts';
import { quadrupletNu } from './quadruplet-nu.ts';
import { singletonCacheBloc } from './singleton-cache-bloc.ts';
import { singletonCache } from './singleton-cache.ts';
import { singletonNu } from './singleton-nu.ts';
import { skyscraper } from './skyscraper.ts';
import { swordfish } from './swordfish.ts';
import { tripletCache } from './triplet-cache.ts';
import { tripletNu } from './triplet-nu.ts';
import { xChain } from './x-chain.ts';
import { xWing } from './x-wing.ts';
import { xyChain } from './xy-chain.ts';
import { xyzWing } from './xyz-wing.ts';
import { yWing } from './y-wing.ts';

export const TECHNIQUES: readonly Technique[] = [
  dernierChiffre,
  singletonCacheBloc,
  singletonNu,
  singletonCache,
  paireNue,
  paireCachee,
  pointing,
  claiming,
  tripletNu,
  tripletCache,
  quadrupletNu,
  quadrupletCache,
  skyscraper,
  deuxStringKite,
  xWing,
  yWing,
  xyzWing,
  swordfish,
  xChain,
  xyChain,
  forcingSimple,
];

/** Technique correspondant à un identifiant. */
export function techniqueParId(id: IdTechnique): Technique {
  const technique = TECHNIQUES.find((t) => t.id === id);
  if (technique === undefined) throw new Error(`Technique inconnue : ${id}`);
  return technique;
}
