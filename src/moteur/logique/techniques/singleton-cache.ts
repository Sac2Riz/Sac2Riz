// Singleton caché (Facile) : dans une région complète quelconque (ligne, colonne, bloc,
// diagonale, région irrégulière), un chiffre n'a plus qu'une place possible. Code pur.

import { chercherSingletonCache } from '../familles/singleton-cache.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'singleton-cache', niveau: 'facile', nom: 'Singleton caché' };

export const singletonCache: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherSingletonCache(infos, ctx, etat, null),
};
