// Singleton caché dans une zone (Débutant, Tectonic) : dans une zone, un chiffre n'a plus qu'une
// place possible (les cases voisines ont éliminé les autres). Voir familles/singleton-cache.ts. Code pur.

import { chercherSingletonCache } from '../familles/singleton-cache.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'singleton-cache-zone', niveau: 'debutant', nom: 'Seule place dans la zone' };

export const singletonCacheZone: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherSingletonCache(infos, ctx, etat, ['zone']),
};
