// Famille « intersections » (pointing et claiming) : dans une région complète A, une valeur
// ne peut aller que dans des cases qui appartiennent toutes aussi à une autre région B.
// La valeur sera donc dans A ∩ B : on la retire des autres cases de B.
//
// - pointing : A est un bloc (ou une région irrégulière), B une ligne, une colonne, une diagonale… ;
// - claiming : A est une ligne, une colonne ou une diagonale, B en général un bloc.
// B peut être n'importe quelle région à chiffres distincts. Code pur.

import type { EtatLogique, Etape } from '../../../types/logique.ts';
import { masqueDe, valeursDuMasque } from '../../candidats.ts';
import { cellulesDe, estDans, regionsCompletes, type Contexte, type FormeRegion } from '../contexte.ts';
import { majuscule, nomRegion, nomsCellules } from '../noms.ts';
import { positions, valeursPlacees } from '../outils.ts';
import { construireEtape, type InfosTechnique } from '../technique.ts';

export function chercherIntersection(
  infos: InfosTechnique,
  ctx: Contexte,
  etat: EtatLogique,
  formesDepart: readonly FormeRegion[],
): Etape | null {
  for (const a of regionsCompletes(ctx, formesDepart)) {
    for (const v of valeursDuMasque((ctx.valeursRegion[a] ?? 0) & ~valeursPlacees(ctx, etat, a))) {
      const p = positions(ctx, etat, a, v);
      if (p.length < 2) continue;
      // Toutes les régions B (≠ A) qui contiennent toutes les places du chiffre
      for (const b of ctx.structure.regionsCellule[p[0] ?? 0] ?? []) {
        if (b === a || ctx.structure.distincte[b] !== 1 || !p.every((c) => estDans(ctx, b, c))) continue;
        const cibles = Array.from(cellulesDe(ctx, b)).filter((c) => !estDans(ctx, a, c));
        const etape = construireEtape(infos, ctx, etat, {
          cellules: p,
          candidatsMotif: p.map((cellule) => ({ cellule, valeurs: [v] })),
          regions: [a, b],
          description:
            `${majuscule(nomRegion(ctx, a))} : le ${v} ne peut aller que dans ${nomsCellules(ctx, p)}, ` +
            `qui sont aussi dans ${nomRegion(ctx, b)}. Le ${v} de ${nomRegion(ctx, b)} est donc là.`,
          placements: [],
          eliminations: cibles.map((cellule) => ({ cellule, masque: masqueDe(v) })),
        });
        if (etape !== null) return etape;
      }
    }
  }
  return null;
}
