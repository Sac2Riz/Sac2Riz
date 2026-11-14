// ÉTAT du solveur des chiffres casés : nombre affecté et nombres candidats de chaque emplacement.
// Jamais modifié : chaque opération renvoie un nouvel état. Code pur.
//
// Tenue des candidats à chaque placement (ce que fait un joueur en regardant la grille) :
// - le nombre placé est retiré des autres emplacements de même longueur ;
// - ses chiffres sont écrits dans les cases : les emplacements qui le croisent ne gardent que
//   les nombres qui ont ce chiffre à cet endroit.

import type { Probleme } from '../probleme.ts';

export type EtatSolveur = {
  /** Nombre (indice dans la liste) de chaque emplacement, ou −1. */
  readonly affectes: readonly number[];
  /** Nombres encore possibles dans chaque emplacement (un seul, celui affecté, s'il est rempli). */
  readonly candidats: readonly (readonly number[])[];
};

export type PlacementSolveur = { readonly emplacement: number; readonly nombre: number };
export type EliminationSolveur = { readonly emplacement: number; readonly nombres: readonly number[] };

/** Place un nombre et tient à jour les candidats des autres emplacements. */
export function placer(p: Probleme, etat: EtatSolveur, emplacement: number, nombre: number): EtatSolveur {
  const affectes = [...etat.affectes];
  const candidats = [...etat.candidats];
  affectes[emplacement] = nombre;
  candidats[emplacement] = [nombre];
  for (const autre of p.memeLongueur[emplacement] ?? []) {
    const c = candidats[autre] ?? [];
    if (c.includes(nombre)) candidats[autre] = c.filter((n) => n !== nombre);
  }
  const chiffres = p.chiffres[nombre] ?? [];
  for (const cr of p.grille.croisements[emplacement] ?? []) {
    const chiffre = chiffres[cr.position];
    const c = candidats[cr.autre] ?? [];
    if (c.some((n) => p.chiffres[n]?.[cr.positionAutre] !== chiffre)) {
      candidats[cr.autre] = c.filter((n) => p.chiffres[n]?.[cr.positionAutre] === chiffre);
    }
  }
  return { affectes, candidats };
}

/** Retire des candidats (jamais le nombre d'un emplacement déjà rempli). */
export function eliminer(etat: EtatSolveur, eliminations: readonly EliminationSolveur[]): EtatSolveur {
  const candidats = [...etat.candidats];
  for (const { emplacement, nombres } of eliminations) {
    if ((etat.affectes[emplacement] ?? -1) >= 0) continue;
    candidats[emplacement] = (candidats[emplacement] ?? []).filter((n) => !nombres.includes(n));
  }
  return { affectes: etat.affectes, candidats };
}

/** État de départ : tous les nombres de sa longueur pour chaque emplacement, puis les nombres donnés. */
export function etatDepart(p: Probleme, donnes: readonly PlacementSolveur[]): EtatSolveur {
  let etat: EtatSolveur = {
    affectes: p.grille.emplacements.map(() => -1),
    candidats: p.nombresDeLongueur,
  };
  for (const { emplacement, nombre } of donnes) etat = placer(p, etat, emplacement, nombre);
  return etat;
}

/** Nombres pas encore affectés d'une longueur. */
export function nombresLibres(p: Probleme, etat: EtatSolveur, longueur: number): number[] {
  const pris = new Set(etat.affectes);
  return (p.nombresParLongueur.get(longueur) ?? []).filter((n) => !pris.has(n));
}

/** Emplacements pas encore remplis d'une longueur. */
export function emplacementsLibres(p: Probleme, etat: EtatSolveur, longueur: number): number[] {
  return (p.emplacementsParLongueur.get(longueur) ?? []).filter((id) => (etat.affectes[id] ?? -1) < 0);
}

/**
 * Vrai si l'état est impossible : un emplacement sans candidat, un nombre libre qui ne va nulle
 * part, ou un nombre affecté deux fois.
 */
export function contradiction(p: Probleme, etat: EtatSolveur): boolean {
  if (etat.candidats.some((c) => c.length === 0)) return true;
  const affectes = etat.affectes.filter((n) => n >= 0);
  if (new Set(affectes).size !== affectes.length) return true;
  for (const longueur of p.longueurs) {
    const libres = emplacementsLibres(p, etat, longueur);
    for (const n of nombresLibres(p, etat, longueur)) {
      if (!libres.some((id) => etat.candidats[id]?.includes(n) === true)) return true;
    }
  }
  return false;
}

export function estResolu(etat: EtatSolveur): boolean {
  return etat.affectes.every((n) => n >= 0);
}

/** Chiffre écrit dans chaque case par les emplacements remplis (−1 si aucun). */
export function chiffresEcrits(p: Probleme, etat: EtatSolveur): number[] {
  const chiffres = p.grille.noires.map(() => -1);
  for (const e of p.grille.emplacements) {
    const n = etat.affectes[e.id] ?? -1;
    if (n < 0) continue;
    e.cellules.forEach((c, i) => {
      chiffres[c] = p.chiffres[n]?.[i] ?? -1;
    });
  }
  return chiffres;
}
