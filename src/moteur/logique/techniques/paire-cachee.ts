// Paire cachée (Moyen) : dans une région complète, deux chiffres ne peuvent aller que dans
// les deux mêmes cases. Générique. Voir familles/sous-ensembles.ts. Code pur.

import { chercherSousEnsembleCache } from '../familles/sous-ensembles.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'paire-cachee', niveau: 'moyen', nom: 'Paire cachée' };

export const paireCachee: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherSousEnsembleCache(infos, ctx, etat, 2),
};
