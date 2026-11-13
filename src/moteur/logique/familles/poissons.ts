// Famille « poissons » (X-Wing pour 2, Swordfish pour 3) sur un chiffre v :
// dans n lignes complètes (les « bases »), v ne peut aller que dans n colonnes (les « couvertures »).
// Chaque base contient v exactement une fois, sur des colonnes toutes différentes : les n colonnes
// reçoivent donc leur v dans les bases. On retire v du reste de ces colonnes.
// Même raisonnement en échangeant lignes et colonnes.
//
// Généricité : utilise les régions de forme 'ligne' et 'colonne', présentes dans toutes les variantes
// de sudoku (classique, diagonal, irrégulier, 6x6…). Les régions supplémentaires (diagonales, blocs
// irréguliers) ne gênent pas le raisonnement. Code pur.

import type { Cellule } from '../../../types/grille.ts';
import type { EtatLogique, Etape } from '../../../types/logique.ts';
import { masqueDe, valeursDuMasque } from '../../candidats.ts';
import { cellulesDe, estDans, regionCommune, regionsCompletes, type Contexte, type FormeRegion } from '../contexte.ts';
import { nomsRegions } from '../noms.ts';
import { combinaisons, positions } from '../outils.ts';
import { construireEtape, type InfosTechnique } from '../technique.ts';

const ORIENTATIONS: readonly (readonly [FormeRegion, FormeRegion])[] = [
  ['ligne', 'colonne'],
  ['colonne', 'ligne'],
];

export function chercherPoisson(
  infos: InfosTechnique,
  ctx: Contexte,
  etat: EtatLogique,
  taille: number,
): Etape | null {
  for (const v of valeursDuMasque(ctx.masqueValeurs)) {
    for (const [formeBase, formeCouverture] of ORIENTATIONS) {
      // Bases possibles : v y a entre 2 et « taille » places
      const placesDe = new Map<number, Cellule[]>();
      for (const r of regionsCompletes(ctx, [formeBase])) {
        const p = positions(ctx, etat, r, v);
        if (p.length >= 2 && p.length <= taille) placesDe.set(r, p);
      }
      for (const bases of combinaisons([...placesDe.keys()], taille)) {
        const cellules = bases.flatMap((r) => placesDe.get(r) ?? []);
        const couvertures = new Set<number>();
        for (const c of cellules) couvertures.add(regionCommune(ctx, [c], [formeCouverture]));
        if (couvertures.has(-1) || couvertures.size !== taille) continue;
        const listeCouvertures = [...couvertures].sort((a, b) => a - b);
        const cibles = listeCouvertures.flatMap((q) =>
          Array.from(cellulesDe(ctx, q)).filter((c) => !bases.some((b) => estDans(ctx, b, c))),
        );
        const etape = construireEtape(infos, ctx, etat, {
          cellules: [...cellules].sort((a, b) => a - b),
          candidatsMotif: cellules.map((cellule) => ({ cellule, valeurs: [v] })),
          regions: [...bases, ...listeCouvertures],
          description:
            `${infos.nom} sur le ${v} : dans ${nomsRegions(ctx, bases)}, le ${v} ne peut aller que dans ` +
            `${nomsRegions(ctx, listeCouvertures)}. Le ${v} de chacune de ces ${formeCouverture}s est donc dans le motif.`,
          placements: [],
          eliminations: cibles.map((cellule) => ({ cellule, masque: masqueDe(v) })),
        });
        if (etape !== null) return etape;
      }
    }
  }
  return null;
}
