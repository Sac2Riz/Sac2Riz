// Famille « singleton caché » : dans une région complète, une valeur qui n'a plus qu'une
// place possible y est forcément. Utilisée par singleton-cache-bloc (Débutant, blocs et régions
// irrégulières seulement) et singleton-cache (Facile, toutes les régions complètes). Code pur.

import type { EtatLogique, Etape } from '../../../types/logique.ts';
import { valeursDuMasque } from '../../candidats.ts';
import { regionsCompletes, type Contexte, type FormeRegion } from '../contexte.ts';
import { majuscule, nomCellule, nomRegion } from '../noms.ts';
import { positions, valeursPlacees } from '../outils.ts';
import { construireEtape, type InfosTechnique } from '../technique.ts';

export function chercherSingletonCache(
  infos: InfosTechnique,
  ctx: Contexte,
  etat: EtatLogique,
  formes: readonly FormeRegion[] | null,
): Etape | null {
  for (const r of regionsCompletes(ctx, formes)) {
    const manquantes = ctx.masqueValeurs & ~valeursPlacees(ctx, etat, r);
    for (const v of valeursDuMasque(manquantes)) {
      const p = positions(ctx, etat, r, v);
      const [cellule] = p;
      if (p.length !== 1 || cellule === undefined) continue;
      const etape = construireEtape(infos, ctx, etat, {
        cellules: [cellule],
        candidatsMotif: [{ cellule, valeurs: [v] }],
        regions: [r],
        description: `${majuscule(nomRegion(ctx, r))} : le ${v} ne peut aller qu'en ${nomCellule(ctx, cellule)}.`,
        placements: [{ cellule, valeur: v }],
        eliminations: [],
      });
      if (etape !== null) return etape;
    }
  }
  return null;
}
