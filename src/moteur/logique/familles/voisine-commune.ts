// Famille « voisine commune » (étape 7a, pensée pour le Tectonic) : dans une région complète, un
// chiffre n'a plus que quelques places. Il sera forcément dans l'une d'elles : une case qui VOIT
// toutes ces places (au Tectonic : qui les touche toutes) ne peut donc pas le contenir.
//
// Généralise pointing et claiming : la case visée n'a pas besoin de partager une même région avec
// toutes les places. Au sudoku, elle reviendrait exactement à ces deux techniques (elle n'est pas
// dans la liste du sudoku). Graduée par le nombre de places à vérifier : 2 (voisine-commune),
// 3 ou plus (voisine-commune-etendue). Code pur.

import type { EtatLogique, Etape } from '../../../types/logique.ts';
import { masqueDe, valeursDuMasque } from '../../candidats.ts';
import { regionsCompletes, type Contexte } from '../contexte.ts';
import { majuscule, nomRegion, nomsCellules } from '../noms.ts';
import { casesVoyant, positions, valeursPlacees } from '../outils.ts';
import { construireEtape, type InfosTechnique } from '../technique.ts';

/** Nombre de places du chiffre accepté par la technique. */
export type PlagePlaces = { readonly min: number; readonly max: number };

/** « touche » / « touchent » (Tectonic) ou « voit » / « voient ». */
function verbe(touche: boolean, pluriel: boolean): string {
  if (touche) return pluriel ? 'touchent' : 'touche';
  return pluriel ? 'voient' : 'voit';
}

export function chercherVoisineCommune(
  infos: InfosTechnique,
  ctx: Contexte,
  etat: EtatLogique,
  places: PlagePlaces,
): Etape | null {
  for (const r of regionsCompletes(ctx, null)) {
    // Au Tectonic, une case hors de la zone ne « voit » les places qu'en les touchant
    const touche = ctx.formes[r] === 'zone';
    for (const v of valeursDuMasque((ctx.valeursRegion[r] ?? 0) & ~valeursPlacees(ctx, etat, r))) {
      const p = positions(ctx, etat, r, v);
      if (p.length < places.min || p.length > places.max) continue;
      const cibles = casesVoyant(ctx, etat, v, p);
      if (cibles.length === 0) continue;
      const etape = construireEtape(infos, ctx, etat, {
        cellules: p,
        candidatsMotif: p.map((cellule) => ({ cellule, valeurs: [v] })),
        regions: [r],
        description:
          `${majuscule(nomRegion(ctx, r))} : le ${v} ne peut aller que dans ${nomsCellules(ctx, p)}. ` +
          `${nomsCellules(ctx, cibles)} ${verbe(touche, cibles.length > 1)} toutes ces cases : ` +
          `${cibles.length > 1 ? 'elles ne peuvent' : 'elle ne peut'} pas contenir le ${v}.`,
        placements: [],
        eliminations: cibles.map((cellule) => ({ cellule, masque: masqueDe(v) })),
      });
      if (etape !== null) return etape;
    }
  }
  return null;
}
