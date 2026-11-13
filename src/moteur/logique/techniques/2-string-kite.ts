// 2-String Kite (Difficile) : un lien fort dans une ligne et un lien fort dans une colonne,
// sur un même chiffre, reliés par deux extrémités situées dans un même bloc.
// Voir familles/liens-forts.ts.
// Généricité : lignes, colonnes et blocs ; les régions irrégulières jouent le rôle des blocs.
// Sur une grille sans blocs, cette technique ne se déclenche jamais. Code pur.

import { regionCommune } from '../contexte.ts';
import { chercherDeuxLiens } from '../familles/liens-forts.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: '2-string-kite', niveau: 'difficile', nom: '2-String Kite' };

export const deuxStringKite: Technique = {
  ...infos,
  chercher: (ctx, etat) =>
    chercherDeuxLiens(infos, ctx, etat, (c, l1, l2) => {
      if (c.formes[l1.region] !== 'ligne' || c.formes[l2.region] !== 'colonne') return -1;
      return regionCommune(c, [l1.y, l2.y], ['bloc', 'irreguliere']);
    }),
};
