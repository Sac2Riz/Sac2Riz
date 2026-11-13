// Dernier chiffre (Débutant) : une région complète n'a plus qu'une case vide ;
// elle reçoit le seul chiffre qui manque. Générique : toute région complète
// (ligne, colonne, bloc, diagonale, région irrégulière). Code pur.

import { compterBits, plusPetiteValeur } from '../../candidats.ts';
import { regionsCompletes } from '../contexte.ts';
import { majuscule, nomCellule, nomRegion } from '../noms.ts';
import { casesVides, valeursPlacees } from '../outils.ts';
import { construireEtape, type InfosTechnique, type Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'dernier-chiffre', niveau: 'debutant', nom: 'Dernier chiffre' };

export const dernierChiffre: Technique = {
  ...infos,
  chercher(ctx, etat) {
    for (const r of regionsCompletes(ctx, null)) {
      const [cellule, ...autres] = casesVides(ctx, etat, r);
      if (cellule === undefined || autres.length > 0) continue;
      const manquant = ctx.masqueValeurs & ~valeursPlacees(ctx, etat, r);
      if (compterBits(manquant) !== 1 || ((etat.candidats[cellule] ?? 0) & manquant) === 0) continue;
      const v = plusPetiteValeur(manquant);
      const etape = construireEtape(infos, ctx, etat, {
        cellules: [cellule],
        candidatsMotif: [{ cellule, valeurs: [v] }],
        regions: [r],
        description: `${majuscule(nomRegion(ctx, r))} n'a plus qu'une case vide, ${nomCellule(ctx, cellule)} : il n'y manque que le ${v}.`,
        placements: [{ cellule, valeur: v }],
        eliminations: [],
      });
      if (etape !== null) return etape;
    }
    return null;
  },
};
