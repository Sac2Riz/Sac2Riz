// Pointing (Moyen) : dans un bloc (ou une région irrégulière), un chiffre ne peut aller que dans
// des cases alignées sur une même ligne, colonne ou diagonale ; on le retire du reste de cette région.
// Voir familles/intersections.ts. Code pur.

import { chercherIntersection } from '../familles/intersections.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'pointing', niveau: 'moyen', nom: 'Pointing' };

export const pointing: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherIntersection(infos, ctx, etat, ['bloc', 'irreguliere']),
};
