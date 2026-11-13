// Claiming (Moyen) : dans une ligne, une colonne ou une diagonale, un chiffre ne peut aller que
// dans des cases d'un même bloc (ou région irrégulière) ; on le retire du reste de ce bloc.
// Voir familles/intersections.ts. Code pur.

import { chercherIntersection } from '../familles/intersections.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'claiming', niveau: 'moyen', nom: 'Claiming' };

export const claiming: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherIntersection(infos, ctx, etat, ['ligne', 'colonne', 'diagonale']),
};
