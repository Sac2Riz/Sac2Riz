// Triplet nu (Difficile) : trois cases d'une région n'ont, à elles trois, que trois candidats.
// Générique. Voir familles/sous-ensembles.ts. Code pur.

import { chercherSousEnsembleNu } from '../familles/sous-ensembles.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'triplet-nu', niveau: 'difficile', nom: 'Triplet nu' };

export const tripletNu: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherSousEnsembleNu(infos, ctx, etat, 3),
};
