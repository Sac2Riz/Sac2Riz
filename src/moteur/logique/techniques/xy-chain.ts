// XY-Chain (Diabolique) : chaîne de cases à deux candidats, chacune voyant la suivante.
// Si la première case s ne vaut pas z, elle vaut son autre candidat, qui est exclu de la case
// suivante, qui vaut donc son autre candidat… jusqu'à la dernière case e, qui vaut alors z.
// Donc s ou e vaut z : on retire z des cases qui voient s et e.
// Recherche en largeur : la chaîne utile la plus courte (au moins 3 cases) est retenue.
// Générique (relation « se voient »). Code pur.

import type { Cellule } from '../../../types/grille.ts';
import type { EtatLogique, Etape } from '../../../types/logique.ts';
import { masqueDe, plusPetiteValeur, valeursDuMasque } from '../../candidats.ts';
import type { Contexte } from '../contexte.ts';
import { nomCellule } from '../noms.ts';
import { casesBivaleurs, casesVoyant } from '../outils.ts';
import { construireEtape, type InfosTechnique, type Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'xy-chain', niveau: 'diabolique', nom: 'XY-Chain' };

/** État de recherche : case + valeur qu'elle prend si s ne vaut pas z. Clé = case * 32 + (valeur - 1). */
type Maillon = { readonly parent: number; readonly profondeur: number };
const cle = (cellule: Cellule, valeur: number): number => cellule * 32 + (valeur - 1);

/** L'autre candidat d'une case bivaleur. */
function autre(etat: EtatLogique, cellule: Cellule, valeur: number): number {
  return plusPetiteValeur((etat.candidats[cellule] ?? 0) & ~masqueDe(valeur));
}

function depuis(
  ctx: Contexte,
  etat: EtatLogique,
  s: Cellule,
  z: number,
  estBivaleur: Set<Cellule>,
  longueurMax: number,
): { etape: Etape; longueur: number } | null {
  const depart = cle(s, autre(etat, s, z));
  const vus = new Map<number, Maillon>([[depart, { parent: -1, profondeur: 1 }]]);
  const file = [depart];
  for (let i = 0; i < file.length; i++) {
    const k = file[i] ?? 0;
    const maillon = vus.get(k);
    if (maillon === undefined || maillon.profondeur >= longueurMax) break;
    const c = Math.floor(k / 32);
    const vraie = (k % 32) + 1;
    for (const d of ctx.voisins[c] ?? []) {
      if (!estBivaleur.has(d) || ((etat.candidats[d] ?? 0) & masqueDe(vraie)) === 0) continue;
      const suivante = autre(etat, d, vraie);
      const kd = cle(d, suivante);
      if (vus.has(kd)) continue;
      const nouveau = { parent: k, profondeur: maillon.profondeur + 1 };
      vus.set(kd, nouveau);
      file.push(kd);
      if (suivante !== z || d === s || nouveau.profondeur < 3) continue;
      const etape = construire(ctx, etat, z, kd, vus);
      if (etape !== null) return { etape, longueur: nouveau.profondeur };
    }
  }
  return null;
}

function construire(ctx: Contexte, etat: EtatLogique, z: number, fin: number, vus: Map<number, Maillon>): Etape | null {
  const cles: number[] = [];
  for (let k = fin; k !== -1; k = vus.get(k)?.parent ?? -1) cles.unshift(k);
  const cellules = cles.map((k) => Math.floor(k / 32));
  const s = cellules[0] ?? 0;
  const e = cellules[cellules.length - 1] ?? 0;
  // Chaque case : « L1C1 (2→5) » = valeur exclue → valeur prise
  const texte = cles
    .map((k) => {
      const c = Math.floor(k / 32);
      const vraie = (k % 32) + 1;
      return `${nomCellule(ctx, c)} (${autre(etat, c, vraie)}→${vraie})`;
    })
    .join(' - ');
  return construireEtape(infos, ctx, etat, {
    cellules,
    candidatsMotif: cellules.map((cellule) => ({ cellule, valeurs: valeursDuMasque(etat.candidats[cellule] ?? 0) })),
    regions: [],
    description:
      `Chaîne XY : ${texte}. Si ${nomCellule(ctx, s)} ne vaut pas ${z}, chaque case force la suivante ` +
      `jusqu'à ${nomCellule(ctx, e)} = ${z} : l'une des deux extrémités vaut ${z}.`,
    placements: [],
    eliminations: casesVoyant(ctx, etat, z, [s, e]).map((cellule) => ({ cellule, masque: masqueDe(z) })),
  });
}

export const xyChain: Technique = {
  ...infos,
  chercher(ctx, etat) {
    const bivaleurs = casesBivaleurs(etat);
    const estBivaleur = new Set(bivaleurs);
    let meilleure: { etape: Etape; longueur: number } | null = null;
    for (const s of bivaleurs) {
      for (const z of valeursDuMasque(etat.candidats[s] ?? 0)) {
        const trouvee = depuis(ctx, etat, s, z, estBivaleur, meilleure === null ? Infinity : meilleure.longueur - 1);
        if (trouvee !== null && (meilleure === null || trouvee.longueur < meilleure.longueur)) meilleure = trouvee;
      }
    }
    return meilleure?.etape ?? null;
  },
};
