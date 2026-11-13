// Skyscraper (Difficile) : deux liens forts sur un même chiffre, tous deux dans des lignes
// (ou tous deux dans des colonnes), dont deux extrémités sont sur une même colonne (ou ligne).
// Voir familles/liens-forts.ts.
// Généricité : ne s'appuie que sur les régions 'ligne' et 'colonne' (présentes dans toutes les variantes).
// Code pur.

import { regionCommune, type FormeRegion } from '../contexte.ts';
import { chercherDeuxLiens } from '../familles/liens-forts.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'skyscraper', niveau: 'difficile', nom: 'Skyscraper' };

const PERPENDICULAIRE: Partial<Record<FormeRegion, FormeRegion>> = { ligne: 'colonne', colonne: 'ligne' };

export const skyscraper: Technique = {
  ...infos,
  chercher: (ctx, etat) =>
    chercherDeuxLiens(infos, ctx, etat, (c, l1, l2) => {
      const forme = c.formes[l1.region];
      const perpendiculaire = forme === undefined ? undefined : PERPENDICULAIRE[forme];
      if (perpendiculaire === undefined || c.formes[l2.region] !== forme || l1.region === l2.region) return -1;
      return regionCommune(c, [l1.y, l2.y], [perpendiculaire]);
    }),
};
