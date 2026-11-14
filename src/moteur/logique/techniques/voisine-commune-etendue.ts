// Voisine commune étendue (Moyen) : comme la voisine commune, avec 3 places ou plus à vérifier.
// Voir familles/voisine-commune.ts. Code pur.

import { chercherVoisineCommune } from '../familles/voisine-commune.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'voisine-commune-etendue', niveau: 'moyen', nom: 'Voisine commune étendue' };

export const voisineCommuneEtendue: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherVoisineCommune(infos, ctx, etat, { min: 3, max: Number.POSITIVE_INFINITY }),
};
