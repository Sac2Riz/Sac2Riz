// Singleton nu (Facile) : une case vide n'a plus qu'un candidat. Générique. Code pur.

import { compterBits, plusPetiteValeur } from '../../candidats.ts';
import { nomCellule } from '../noms.ts';
import { construireEtape, type InfosTechnique, type Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'singleton-nu', niveau: 'facile', nom: 'Singleton nu' };

export const singletonNu: Technique = {
  ...infos,
  chercher(ctx, etat) {
    for (let cellule = 0; cellule < ctx.nombreCellules; cellule++) {
      const masque = etat.candidats[cellule] ?? 0;
      if ((etat.valeurs[cellule] ?? 0) !== 0 || compterBits(masque) !== 1) continue;
      const v = plusPetiteValeur(masque);
      const etape = construireEtape(infos, ctx, etat, {
        cellules: [cellule],
        candidatsMotif: [{ cellule, valeurs: [v] }],
        regions: [],
        description: `${nomCellule(ctx, cellule)} n'a plus qu'un candidat possible : le ${v}.`,
        placements: [{ cellule, valeur: v }],
        eliminations: [],
      });
      if (etape !== null) return etape;
    }
    return null;
  },
};
