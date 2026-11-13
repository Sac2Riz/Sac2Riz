// Paire nue (Moyen) : deux cases d'une région n'ont, à elles deux, que deux candidats.
// Générique (toute région à chiffres distincts). Voir familles/sous-ensembles.ts. Code pur.

import { chercherSousEnsembleNu } from '../familles/sous-ensembles.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'paire-nue', niveau: 'moyen', nom: 'Paire nue' };

export const paireNue: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherSousEnsembleNu(infos, ctx, etat, 2),
};
