// Forcing simple (Diabolique) : on part d'une case à deux candidats {x, y} et on suppose tour à
// tour x puis y, en ne posant ensuite que des singletons (nus et cachés). Ce qui est vrai dans
// les DEUX hypothèses est vrai tout court : même valeur posée dans une case, ou candidat éliminé
// dans les deux cas.
// Volontairement exclu : conclure « l'hypothèse x mène à une contradiction, donc y » ; ce
// raisonnement par l'absurde revient à de l'essai-erreur. Une hypothèse contradictoire fait donc
// simplement passer à la case suivante. Générique. Code pur.

import { masqueDe, valeursDuMasque } from '../../candidats.ts';
import { propagerSingletons, type ResultatPropagation } from '../familles/propagation.ts';
import { ensemble, nomCellule } from '../noms.ts';
import { casesBivaleurs } from '../outils.ts';
import { construireEtape, type EliminationBrute, type InfosTechnique, type Technique } from '../technique.ts';
import type { Placement } from '../../../types/logique.ts';

const infos: InfosTechnique = { id: 'forcing-simple', niveau: 'diabolique', nom: 'Forcing simple' };

/** Candidats d'une case après propagation (une case posée n'a plus que sa valeur). */
function masqueApres(r: ResultatPropagation, cellule: number): number {
  const v = r.valeurs[cellule] ?? 0;
  return v !== 0 ? masqueDe(v) : (r.candidats[cellule] ?? 0);
}

export const forcingSimple: Technique = {
  ...infos,
  chercher(ctx, etat) {
    for (const depart of casesBivaleurs(etat)) {
      const [x, y] = valeursDuMasque(etat.candidats[depart] ?? 0);
      if (x === undefined || y === undefined) continue;
      const rx = propagerSingletons(ctx, etat, depart, x);
      if (rx.contradiction) continue;
      const ry = propagerSingletons(ctx, etat, depart, y);
      if (ry.contradiction) continue;

      const placements: Placement[] = [];
      const eliminations: EliminationBrute[] = [];
      for (let c = 0; c < ctx.nombreCellules; c++) {
        if (c === depart || (etat.valeurs[c] ?? 0) !== 0) continue;
        const vx = rx.valeurs[c] ?? 0;
        if (vx !== 0 && vx === ry.valeurs[c]) placements.push({ cellule: c, valeur: vx });
        const restants = masqueApres(rx, c) | masqueApres(ry, c);
        const retires = (etat.candidats[c] ?? 0) & ~restants;
        if (retires !== 0) eliminations.push({ cellule: c, masque: retires });
      }
      // Les placements suffisent (ils entraînent les éliminations) : on garde l'indice simple
      const etape = construireEtape(infos, ctx, etat, {
        cellules: [depart],
        candidatsMotif: [{ cellule: depart, valeurs: [x, y] }],
        regions: [],
        description:
          `Forcing à partir de ${nomCellule(ctx, depart)} ${ensemble([x, y])} : en supposant ${x}, puis ${y}, ` +
          `et en ne posant ensuite que des singletons, les deux hypothèses mènent à la même conclusion.`,
        placements,
        eliminations: placements.length > 0 ? [] : eliminations,
      });
      if (etape !== null) return etape;
    }
    return null;
  },
};
