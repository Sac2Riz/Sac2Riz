// Voisine commune (Facile) : dans une région complète, un chiffre n'a plus que 2 places ; une case
// qui voit (au Tectonic : touche) les deux ne peut pas le contenir. Voir familles/voisine-commune.ts. Code pur.

import { chercherVoisineCommune } from '../familles/voisine-commune.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'voisine-commune', niveau: 'facile', nom: 'Voisine commune' };

export const voisineCommune: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherVoisineCommune(infos, ctx, etat, { min: 2, max: 2 }),
};
