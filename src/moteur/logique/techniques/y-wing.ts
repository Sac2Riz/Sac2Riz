// Y-Wing (Expert) : un pivot à deux candidats {x, y} voit deux « pinces » {x, z} et {y, z}.
// Quel que soit le chiffre du pivot, l'une des deux pinces vaut z : on retire z des cases
// qui voient les deux pinces. Générique (relation « se voient »). Code pur.

import { compterBits, valeursDuMasque } from '../../candidats.ts';
import { ensemble, nomCellule } from '../noms.ts';
import { casesBivaleurs, casesVoyant } from '../outils.ts';
import { candidatsDe, construireEtape, type InfosTechnique, type Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'y-wing', niveau: 'expert', nom: 'Y-Wing' };

export const yWing: Technique = {
  ...infos,
  chercher(ctx, etat) {
    const bivaleurs = casesBivaleurs(etat);
    const estBivaleur = new Set(bivaleurs);
    for (const pivot of bivaleurs) {
      const mPivot = etat.candidats[pivot] ?? 0;
      // Pinces possibles : cases bivaleurs voisines partageant exactement un candidat avec le pivot
      const pinces = Array.from(ctx.voisins[pivot] ?? []).filter(
        (c) => estBivaleur.has(c) && compterBits((etat.candidats[c] ?? 0) & mPivot) === 1,
      );
      for (let i = 0; i < pinces.length; i++) {
        for (let j = i + 1; j < pinces.length; j++) {
          const a = pinces[i] ?? 0;
          const b = pinces[j] ?? 0;
          const mA = etat.candidats[a] ?? 0;
          const mB = etat.candidats[b] ?? 0;
          const z = mA & ~mPivot;
          // Même chiffre z hors du pivot, et des chiffres partagés différents (x pour l'une, y pour l'autre)
          if (z !== (mB & ~mPivot) || (mA & mPivot) === (mB & mPivot)) continue;
          const vz = valeursDuMasque(z)[0] ?? 0;
          const cellules = [pivot, a, b];
          const etape = construireEtape(infos, ctx, etat, {
            cellules,
            candidatsMotif: candidatsDe(etat, cellules),
            regions: [],
            description:
              `${infos.nom} : le pivot ${nomCellule(ctx, pivot)} ${ensemble(valeursDuMasque(mPivot))} voit ` +
              `${nomCellule(ctx, a)} ${ensemble(valeursDuMasque(mA))} et ${nomCellule(ctx, b)} ${ensemble(valeursDuMasque(mB))}. ` +
              `Quel que soit le chiffre du pivot, l'une des deux pinces vaut ${vz}.`,
            placements: [],
            eliminations: casesVoyant(ctx, etat, vz, [a, b])
              .filter((c) => c !== pivot)
              .map((cellule) => ({ cellule, masque: z })),
          });
          if (etape !== null) return etape;
        }
      }
    }
    return null;
  },
};
