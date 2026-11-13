// Famille « deux liens forts » (Skyscraper, 2-String Kite) sur un chiffre v :
// deux liens forts x1–y1 et x2–y2 (v est forcément dans l'une des deux cases de chaque lien),
// dont les extrémités y1 et y2 se voient. y1 et y2 ne peuvent pas contenir v toutes les deux,
// donc x1 ou x2 contient v : on retire v des cases qui voient à la fois x1 et x2.
// Chaque technique précise quelles formes de liens et de jonction elle accepte. Code pur.

import type { Cellule } from '../../../types/grille.ts';
import type { EtatLogique, Etape } from '../../../types/logique.ts';
import { masqueDe, valeursDuMasque } from '../../candidats.ts';
import { seVoient, type Contexte } from '../contexte.ts';
import { nomCellule, nomRegion } from '../noms.ts';
import { casesVoyant, liensForts, type LienFort } from '../outils.ts';
import { construireEtape, type InfosTechnique } from '../technique.ts';

/** Liens orientés : x est l'extrémité « libre », y celle qui fait la jonction. */
type LienOriente = { readonly x: Cellule; readonly y: Cellule; readonly region: number };

/**
 * Décide si deux liens orientés forment le motif de la technique.
 * Renvoie la région qui relie y1 et y2, ou -1 si le motif n'est pas reconnu.
 */
export type FiltreDeuxLiens = (ctx: Contexte, l1: LienOriente, l2: LienOriente) => number;

function orientations(lien: LienFort): LienOriente[] {
  return [
    { x: lien.a, y: lien.b, region: lien.region },
    { x: lien.b, y: lien.a, region: lien.region },
  ];
}

export function chercherDeuxLiens(
  infos: InfosTechnique,
  ctx: Contexte,
  etat: EtatLogique,
  filtre: FiltreDeuxLiens,
): Etape | null {
  for (const v of valeursDuMasque(ctx.masqueValeurs)) {
    const liens = liensForts(ctx, etat, v);
    for (let i = 0; i < liens.length; i++) {
      for (let j = 0; j < liens.length; j++) {
        const lien1 = liens[i];
        const lien2 = liens[j];
        if (i === j || lien1 === undefined || lien2 === undefined) continue;
        for (const l1 of orientations(lien1)) {
          for (const l2 of orientations(lien2)) {
            const quatre = new Set([l1.x, l1.y, l2.x, l2.y]);
            // Quatre cases distinctes ; si x1 et x2 se voyaient, ce serait un autre motif (X-Wing…)
            if (quatre.size !== 4 || seVoient(ctx, l1.x, l2.x) || !seVoient(ctx, l1.y, l2.y)) continue;
            const jonction = filtre(ctx, l1, l2);
            if (jonction === -1) continue;
            const cellules = [l1.x, l1.y, l2.y, l2.x];
            const n = (c: Cellule): string => nomCellule(ctx, c);
            const etape = construireEtape(infos, ctx, etat, {
              cellules,
              candidatsMotif: cellules.map((cellule) => ({ cellule, valeurs: [v] })),
              regions: [l1.region, l2.region, jonction],
              description:
                `${infos.nom} sur le ${v} : dans ${nomRegion(ctx, l1.region)}, le ${v} est en ${n(l1.x)} ou ${n(l1.y)} ; ` +
                `dans ${nomRegion(ctx, l2.region)}, en ${n(l2.x)} ou ${n(l2.y)}. ${n(l1.y)} et ${n(l2.y)} se voient ` +
                `(${nomRegion(ctx, jonction)}), donc ${n(l1.x)} ou ${n(l2.x)} contient le ${v}.`,
              placements: [],
              eliminations: casesVoyant(ctx, etat, v, [l1.x, l2.x])
                .filter((c) => !quatre.has(c))
                .map((cellule) => ({ cellule, masque: masqueDe(v) })),
            });
            if (etape !== null) return etape;
          }
        }
      }
    }
  }
  return null;
}
