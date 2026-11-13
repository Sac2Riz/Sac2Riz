// Swordfish (Expert) : poisson de taille 3 (trois lignes, trois colonnes). Voir familles/poissons.ts.
// Généricité : lignes et colonnes, présentes dans toutes les variantes. Code pur.

import { chercherPoisson } from '../familles/poissons.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'swordfish', niveau: 'expert', nom: 'Swordfish' };

export const swordfish: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherPoisson(infos, ctx, etat, 3),
};
