// Outils partagés par les techniques : combinaisons, positions d'un chiffre, liens forts… Code pur.

import type { Cellule } from '../../types/grille.ts';
import type { EtatLogique } from '../../types/logique.ts';
import { masqueDe } from '../candidats.ts';
import { cellulesDe, seVoient, type Contexte } from './contexte.ts';

/** Toutes les combinaisons de k éléments de la liste, dans l'ordre de la liste. */
export function combinaisons<T>(liste: readonly T[], k: number): T[][] {
  const resultat: T[][] = [];
  const courante: T[] = [];
  function choisir(debut: number): void {
    if (courante.length === k) {
      resultat.push([...courante]);
      return;
    }
    for (let i = debut; i <= liste.length - (k - courante.length); i++) {
      // Le « ! » est sûr : i < liste.length grâce à la borne de la boucle
      courante.push(liste[i]!);
      choisir(i + 1);
      courante.pop();
    }
  }
  if (k >= 0 && k <= liste.length) choisir(0);
  return resultat;
}

/** Cases vides d'une région. */
export function casesVides(ctx: Contexte, etat: EtatLogique, region: number): Cellule[] {
  return Array.from(cellulesDe(ctx, region)).filter((c) => (etat.valeurs[c] ?? 0) === 0);
}

/** Masque des valeurs déjà placées dans une région. */
export function valeursPlacees(ctx: Contexte, etat: EtatLogique, region: number): number {
  let masque = 0;
  for (const c of cellulesDe(ctx, region)) {
    const v = etat.valeurs[c] ?? 0;
    if (v !== 0) masque |= masqueDe(v);
  }
  return masque;
}

/** Cases vides d'une région où la valeur v est encore candidate. */
export function positions(ctx: Contexte, etat: EtatLogique, region: number, v: number): Cellule[] {
  const bit = masqueDe(v);
  return Array.from(cellulesDe(ctx, region)).filter(
    (c) => (etat.valeurs[c] ?? 0) === 0 && ((etat.candidats[c] ?? 0) & bit) !== 0,
  );
}

/** Vrai si la case est vide et a v pour candidat. */
export function aCandidat(etat: EtatLogique, cellule: Cellule, v: number): boolean {
  return (etat.valeurs[cellule] ?? 0) === 0 && ((etat.candidats[cellule] ?? 0) & masqueDe(v)) !== 0;
}

/** Cases vides ayant v pour candidat, qui voient toutes les cases de la liste (et n'en font pas partie). */
export function casesVoyant(ctx: Contexte, etat: EtatLogique, v: number, cellules: readonly Cellule[]): Cellule[] {
  const premiere = cellules[0];
  if (premiere === undefined) return [];
  return Array.from(ctx.voisins[premiere] ?? []).filter(
    (c) => aCandidat(etat, c, v) && !cellules.includes(c) && cellules.every((x) => seVoient(ctx, c, x)),
  );
}

/**
 * Lien fort sur un chiffre : dans une région complète, le chiffre n'a plus que deux places a et b.
 * L'une des deux contient forcément ce chiffre.
 */
export type LienFort = {
  readonly a: Cellule;
  readonly b: Cellule;
  readonly region: number;
};

/** Tous les liens forts sur la valeur v (un même couple peut apparaître pour plusieurs régions). */
export function liensForts(ctx: Contexte, etat: EtatLogique, v: number): LienFort[] {
  const liens: LienFort[] = [];
  for (const r of ctx.regionsDistinctes) {
    if (ctx.complete[r] !== 1) continue;
    const p = positions(ctx, etat, r, v);
    const [a, b] = p;
    if (p.length === 2 && a !== undefined && b !== undefined) liens.push({ a, b, region: r });
  }
  return liens;
}

/** Cases vides n'ayant que deux candidats. */
export function casesBivaleurs(etat: EtatLogique): Cellule[] {
  const liste: Cellule[] = [];
  etat.candidats.forEach((masque, c) => {
    if ((etat.valeurs[c] ?? 0) === 0 && masque !== 0 && (masque & (masque - 1)) !== 0) {
      // Deux bits exactement : en retirant le bit le plus bas, il en reste un seul
      const reste = masque & (masque - 1);
      if ((reste & (reste - 1)) === 0) liste.push(c);
    }
  });
  return liste;
}
