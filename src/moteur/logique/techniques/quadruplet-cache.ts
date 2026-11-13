// Quadruplet caché (Difficile) : dans une région complète, quatre chiffres ne peuvent aller que dans
// les quatre mêmes cases. Générique. Voir familles/sous-ensembles.ts. Code pur.

import { chercherSousEnsembleCache } from '../familles/sous-ensembles.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'quadruplet-cache', niveau: 'difficile', nom: 'Quadruplet caché' };

export const quadrupletCache: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherSousEnsembleCache(infos, ctx, etat, 4),
};
