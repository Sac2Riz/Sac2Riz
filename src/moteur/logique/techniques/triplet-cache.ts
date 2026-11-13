// Triplet caché (Difficile) : dans une région complète, trois chiffres ne peuvent aller que dans
// les trois mêmes cases. Générique. Voir familles/sous-ensembles.ts. Code pur.

import { chercherSousEnsembleCache } from '../familles/sous-ensembles.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'triplet-cache', niveau: 'difficile', nom: 'Triplet caché' };

export const tripletCache: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherSousEnsembleCache(infos, ctx, etat, 3),
};
