// X-Chain (Diabolique) : chaîne sur un seul chiffre v, alternant liens forts (« = » : dans une
// région complète, v n'a que ces deux places) et liens faibles (« - » : les deux cases se voient),
// commençant et finissant par un lien fort. Si l'extrémité s ne contient pas v, la chaîne force
// l'autre extrémité e à le contenir : s ou e contient v. On retire v des cases qui voient s et e.
// Recherche en largeur : la chaîne utile la plus courte (au moins 3 liens) est retenue.
// Générique (régions complètes et relation « se voient »). Code pur.

import type { Cellule } from '../../../types/grille.ts';
import type { EtatLogique, Etape } from '../../../types/logique.ts';
import { masqueDe, valeursDuMasque } from '../../candidats.ts';
import type { Contexte } from '../contexte.ts';
import { nomCellule } from '../noms.ts';
import { aCandidat, casesVoyant, liensForts } from '../outils.ts';
import { construireEtape, type InfosTechnique, type Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'x-chain', niveau: 'diabolique', nom: 'X-Chain' };

/** Un maillon atteint pendant la recherche (parité 0 : atteint par un lien fort ; 1 : par un lien faible). */
type Maillon = { readonly parent: number; readonly profondeur: number; readonly region: number };

const cle = (cellule: Cellule, parite: number): number => cellule * 2 + parite;

/** Meilleure chaîne (la plus courte) partant de s, ou null. */
function depuis(
  ctx: Contexte,
  etat: EtatLogique,
  v: number,
  s: Cellule,
  forts: Map<Cellule, { vers: Cellule; region: number }[]>,
  longueurMax: number,
): { etape: Etape; longueur: number } | null {
  const vus = new Map<number, Maillon>([[cle(s, 1), { parent: -1, profondeur: 0, region: -1 }]]);
  const file: number[] = [cle(s, 1)];
  for (let i = 0; i < file.length; i++) {
    const k = file[i] ?? 0;
    const maillon = vus.get(k);
    if (maillon === undefined || maillon.profondeur >= longueurMax) break;
    const c = k >> 1;
    const suivants: { vers: Cellule; region: number }[] =
      (k & 1) === 1
        ? (forts.get(c) ?? [])
        : Array.from(ctx.voisins[c] ?? [])
            .filter((d) => aCandidat(etat, d, v))
            .map((vers) => ({ vers, region: -1 }));
    const parite = (k & 1) === 1 ? 0 : 1;
    for (const { vers, region } of suivants) {
      const kv = cle(vers, parite);
      if (vus.has(kv)) continue;
      const nouveau = { parent: k, profondeur: maillon.profondeur + 1, region };
      vus.set(kv, nouveau);
      file.push(kv);
      if (parite !== 0 || vers === s || nouveau.profondeur < 3) continue;
      const etape = construire(ctx, etat, v, kv, vus);
      if (etape !== null) return { etape, longueur: nouveau.profondeur };
    }
  }
  return null;
}

/** Reconstitue la chaîne terminée par la clé « fin » et construit l'étape. */
function construire(ctx: Contexte, etat: EtatLogique, v: number, fin: number, vus: Map<number, Maillon>): Etape | null {
  const cles: number[] = [];
  for (let k = fin; k !== -1; k = vus.get(k)?.parent ?? -1) cles.unshift(k);
  const cellules = cles.map((k) => k >> 1);
  const s = cellules[0] ?? 0;
  const e = cellules[cellules.length - 1] ?? 0;
  // Texte « L1C1 = L1C5 - L5C5 = L5C9 »
  let texte = nomCellule(ctx, s);
  cles.slice(1).forEach((k) => (texte += `${(k & 1) === 0 ? ' = ' : ' - '}${nomCellule(ctx, k >> 1)}`));
  const regions = [...new Set(cles.map((k) => vus.get(k)?.region ?? -1).filter((r) => r !== -1))];
  return construireEtape(infos, ctx, etat, {
    cellules,
    candidatsMotif: cellules.map((cellule) => ({ cellule, valeurs: [v] })),
    regions,
    description:
      `Chaîne X sur le ${v} : ${texte} (« = » : le ${v} est dans l'une des deux cases, « - » : les cases se voient). ` +
      `L'une des extrémités, ${nomCellule(ctx, s)} ou ${nomCellule(ctx, e)}, contient forcément le ${v}.`,
    placements: [],
    eliminations: casesVoyant(ctx, etat, v, [s, e]).map((cellule) => ({ cellule, masque: masqueDe(v) })),
  });
}

export const xChain: Technique = {
  ...infos,
  chercher(ctx, etat) {
    let meilleure: { etape: Etape; longueur: number } | null = null;
    for (const v of valeursDuMasque(ctx.masqueValeurs)) {
      const forts = new Map<Cellule, { vers: Cellule; region: number }[]>();
      for (const { a, b, region } of liensForts(ctx, etat, v)) {
        forts.set(a, [...(forts.get(a) ?? []), { vers: b, region }]);
        forts.set(b, [...(forts.get(b) ?? []), { vers: a, region }]);
      }
      for (const s of [...forts.keys()].sort((a, b) => a - b)) {
        const trouvee = depuis(ctx, etat, v, s, forts, meilleure === null ? Infinity : meilleure.longueur - 1);
        if (trouvee !== null && (meilleure === null || trouvee.longueur < meilleure.longueur)) meilleure = trouvee;
      }
    }
    return meilleure?.etape ?? null;
  },
};
