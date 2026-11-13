// X-Wing (Expert) : poisson de taille 2 (deux lignes, deux colonnes). Voir familles/poissons.ts.
// Généricité : lignes et colonnes, présentes dans toutes les variantes. Code pur.

import { chercherPoisson } from '../familles/poissons.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'x-wing', niveau: 'expert', nom: 'X-Wing' };

export const xWing: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherPoisson(infos, ctx, etat, 2),
};
