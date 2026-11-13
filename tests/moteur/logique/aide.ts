// Outils des tests du solveur logique : construction d'états de candidats « à la main »
// et lecture des étapes avec des noms de cases lisibles (« L3C5 »).
//
// Les états construits ici sont abstraits : une technique ne lit que les candidats, ce qui
// permet d'isoler exactement le motif testé. Les grilles complètes utilisées dans les tests
// sont, elles, toujours vérifiées par le backtracking (estUnique).

import { masqueComplet, masqueDe } from '../../../src/moteur/candidats.ts';
import { creerContexte, type Contexte } from '../../../src/moteur/logique/contexte.ts';
import { etatInitial } from '../../../src/moteur/logique/etat.ts';
import { nomCellule } from '../../../src/moteur/logique/noms.ts';
import { definitionClassique, regionsClassiques, regionsDiagonales } from '../../../src/moteur/regions.ts';
import type { DefinitionGrille } from '../../../src/types/grille.ts';
import type { EtatLogique, Etape } from '../../../src/types/logique.ts';

export const def9 = definitionClassique(9, 3, 3);
export const ctx9 = creerContexte(def9);
export const defDiagonal: DefinitionGrille = { ...def9, regions: [...regionsClassiques(9, 3, 3), ...regionsDiagonales(9)] };
export const ctxDiagonal = creerContexte(defDiagonal);

/** Indice d'une case à partir de son nom « L3C5 ». */
export function c(nom: string, ctx: Contexte = ctx9): number {
  const correspondance = /^L(\d+)C(\d+)$/.exec(nom);
  if (correspondance === null) throw new Error(`Nom de case invalide : ${nom}`);
  return (Number(correspondance[1]) - 1) * ctx.colonnes + (Number(correspondance[2]) - 1);
}

/** Cases d'une plage : cases('L1', 1, 9) = L1C1 … L1C9 ; cases('C3', 1, 9) = L1C3 … L9C3. */
export function cases(ligneOuColonne: string, debut: number, fin: number): string[] {
  const noms: string[] = [];
  const numero = ligneOuColonne.slice(1);
  for (let i = debut; i <= fin; i++) {
    noms.push(ligneOuColonne.startsWith('L') ? `L${numero}C${i}` : `L${i}C${numero}`);
  }
  return noms;
}

/** État où toutes les cases sont vides avec tous les candidats. */
export function etatVide(ctx: Contexte = ctx9): EtatLogique {
  return etatInitial(ctx, new Array<number>(ctx.nombreCellules).fill(0));
}

/** Fixe les candidats de certaines cases : { L1C1: [2, 7], … }. */
export function fixer(etat: EtatLogique, candidats: Record<string, readonly number[]>, ctx: Contexte = ctx9): EtatLogique {
  const nouveaux = [...etat.candidats];
  for (const [nom, valeurs] of Object.entries(candidats)) nouveaux[c(nom, ctx)] = masqueComplet(valeurs);
  return { valeurs: etat.valeurs, candidats: nouveaux };
}

/** Retire la valeur v des candidats des cases nommées. */
export function retirer(etat: EtatLogique, noms: readonly string[], v: number, ctx: Contexte = ctx9): EtatLogique {
  const nouveaux = [...etat.candidats];
  for (const nom of noms) {
    const cellule = c(nom, ctx);
    nouveaux[cellule] = (nouveaux[cellule] ?? 0) & ~masqueDe(v);
  }
  return { valeurs: etat.valeurs, candidats: nouveaux };
}

/** Retire v de toutes les cases des plages données, sauf de celles listées dans « sauf ». */
export function retirerSauf(
  etat: EtatLogique,
  plages: readonly string[][],
  v: number,
  sauf: readonly string[],
  ctx: Contexte = ctx9,
): EtatLogique {
  return retirer(etat, plages.flat().filter((nom) => !sauf.includes(nom)), v, ctx);
}

/** Éliminations d'une étape sous forme lisible : { L1C2: [2, 7], … }. */
export function eliminations(etape: Etape | null, ctx: Contexte = ctx9): Record<string, readonly number[]> {
  const resultat: Record<string, readonly number[]> = {};
  for (const e of etape?.eliminations ?? []) resultat[nomCellule(ctx, e.cellule)] = e.valeurs;
  return resultat;
}

/** Placements d'une étape sous forme lisible : { L1C9: 9 }. */
export function placements(etape: Etape | null, ctx: Contexte = ctx9): Record<string, number> {
  const resultat: Record<string, number> = {};
  for (const p of etape?.placements ?? []) resultat[nomCellule(ctx, p.cellule)] = p.valeur;
  return resultat;
}

/** Cases du motif sous forme lisible. */
export function motif(etape: Etape | null, ctx: Contexte = ctx9): string[] {
  return (etape?.cellules ?? []).map((cellule) => nomCellule(ctx, cellule));
}

/** Même éliminations (une seule valeur) pour toute une liste de cases. */
export function partout(noms: readonly string[], valeurs: readonly number[]): Record<string, readonly number[]> {
  return Object.fromEntries(noms.map((nom) => [nom, valeurs]));
}
