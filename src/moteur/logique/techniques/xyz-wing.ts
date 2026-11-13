// XYZ-Wing (Expert) : un pivot à trois candidats {x, y, z} voit deux pinces {x, z} et {y, z}.
// Le chiffre z est forcément dans le pivot ou dans l'une des pinces : on retire z des cases
// qui voient les trois. Générique (relation « se voient »). Code pur.

import { compterBits, valeursDuMasque } from '../../candidats.ts';
import { ensemble, nomCellule } from '../noms.ts';
import { casesBivaleurs, casesVoyant } from '../outils.ts';
import { candidatsDe, construireEtape, type InfosTechnique, type Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'xyz-wing', niveau: 'expert', nom: 'XYZ-Wing' };

export const xyzWing: Technique = {
  ...infos,
  chercher(ctx, etat) {
    const estBivaleur = new Set(casesBivaleurs(etat));
    for (let pivot = 0; pivot < ctx.nombreCellules; pivot++) {
      const mPivot = etat.candidats[pivot] ?? 0;
      if ((etat.valeurs[pivot] ?? 0) !== 0 || compterBits(mPivot) !== 3) continue;
      // Pinces : cases bivaleurs voisines dont les candidats sont inclus dans ceux du pivot
      const pinces = Array.from(ctx.voisins[pivot] ?? []).filter(
        (c) => estBivaleur.has(c) && ((etat.candidats[c] ?? 0) & ~mPivot) === 0,
      );
      for (let i = 0; i < pinces.length; i++) {
        for (let j = i + 1; j < pinces.length; j++) {
          const a = pinces[i] ?? 0;
          const b = pinces[j] ?? 0;
          const mA = etat.candidats[a] ?? 0;
          const mB = etat.candidats[b] ?? 0;
          const z = mA & mB;
          if (mA === mB || compterBits(z) !== 1) continue;
          const vz = valeursDuMasque(z)[0] ?? 0;
          const cellules = [pivot, a, b];
          const etape = construireEtape(infos, ctx, etat, {
            cellules,
            candidatsMotif: candidatsDe(etat, cellules),
            regions: [],
            description:
              `${infos.nom} : le pivot ${nomCellule(ctx, pivot)} ${ensemble(valeursDuMasque(mPivot))} voit ` +
              `${nomCellule(ctx, a)} ${ensemble(valeursDuMasque(mA))} et ${nomCellule(ctx, b)} ${ensemble(valeursDuMasque(mB))}. ` +
              `Le ${vz} est forcément dans l'une de ces trois cases.`,
            placements: [],
            eliminations: casesVoyant(ctx, etat, vz, cellules).map((cellule) => ({ cellule, masque: z })),
          });
          if (etape !== null) return etape;
        }
      }
    }
    return null;
  },
};
