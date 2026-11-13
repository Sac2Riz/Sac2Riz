// Quadruplet nu (Difficile) : quatre cases d'une région n'ont, à elles quatre, que quatre candidats.
// Générique. Voir familles/sous-ensembles.ts. Code pur.

import { chercherSousEnsembleNu } from '../familles/sous-ensembles.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'quadruplet-nu', niveau: 'difficile', nom: 'Quadruplet nu' };

export const quadrupletNu: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherSousEnsembleNu(infos, ctx, etat, 4),
};
