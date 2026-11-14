// Paire nue étendue (Moyen, pensée pour le Tectonic) : deux cases qui se voient et n'ont que les
// mêmes deux candidats {x, y}. L'une vaut x, l'autre y : toute case qui voit les deux ne peut
// contenir ni x ni y, même si elle ne partage pas de région avec elles (au Tectonic : une case qui
// touche les deux cases d'une paire d'une même zone). Générique (relation « se voient »). Code pur.

import { valeursDuMasque } from '../../candidats.ts';
import { seVoient, type Contexte } from '../contexte.ts';
import { ensemble, nomCellule } from '../noms.ts';
import { casesBivaleurs } from '../outils.ts';
import { candidatsDe, construireEtape, type InfosTechnique, type Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'paire-nue-etendue', niveau: 'moyen', nom: 'Paire nue étendue' };

/** Lien entre deux cases qui se voient, pour l'explication. */
function lien(ctx: Contexte, a: number, b: number): string {
  const communes = Array.from(ctx.structure.regionsCellule[a] ?? []).filter((r) => ctx.membre[r]?.[b] === 1);
  const formes = communes.map((r) => ctx.formes[r]);
  if (formes.includes('zone')) return 'sont dans la même zone';
  if (formes.includes('carre')) return 'se touchent';
  return 'se voient';
}

export const paireNueEtendue: Technique = {
  ...infos,
  chercher(ctx, etat) {
    const bivaleurs = casesBivaleurs(etat);
    for (let i = 0; i < bivaleurs.length; i++) {
      const a = bivaleurs[i] ?? 0;
      const masque = etat.candidats[a] ?? 0;
      for (let j = i + 1; j < bivaleurs.length; j++) {
        const b = bivaleurs[j] ?? 0;
        if ((etat.candidats[b] ?? 0) !== masque || !seVoient(ctx, a, b)) continue;
        const cibles = Array.from(ctx.voisins[a] ?? []).filter(
          (c) => c !== b && (etat.valeurs[c] ?? 0) === 0 && seVoient(ctx, c, b) && ((etat.candidats[c] ?? 0) & masque) !== 0,
        );
        if (cibles.length === 0) continue;
        const [x, y] = valeursDuMasque(masque);
        const etape = construireEtape(infos, ctx, etat, {
          cellules: [a, b],
          candidatsMotif: candidatsDe(etat, [a, b]),
          regions: [],
          description:
            `${nomCellule(ctx, a)} et ${nomCellule(ctx, b)} ${lien(ctx, a, b)} et n'ont que les candidats ` +
            `${ensemble([x ?? 0, y ?? 0])} : l'une est le ${x}, l'autre le ${y}. Une case qui voit les deux ne peut contenir ni l'un ni l'autre.`,
          placements: [],
          eliminations: cibles.map((cellule) => ({ cellule, masque })),
        });
        if (etape !== null) return etape;
      }
    }
    return null;
  },
};
