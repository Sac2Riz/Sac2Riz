// Fabriques de régions : décrivent les variantes de sudoku sans répéter de code.
// Une variante = une liste de régions (voir docs/ARCHITECTURE.md). Code pur.

import type { Cellule, DefinitionGrille, Region, RegionSomme, RegionUnicite } from '../types/grille.ts';

function unicite(forme: RegionUnicite['forme'], cellules: Cellule[]): RegionUnicite {
  return { type: 'unicite', forme, cellules };
}

/** Une région par ligne. */
export function regionsLignes(lignes: number, colonnes: number): RegionUnicite[] {
  return Array.from({ length: lignes }, (_, l) =>
    unicite('ligne', Array.from({ length: colonnes }, (_, c) => l * colonnes + c)),
  );
}

/** Une région par colonne. */
export function regionsColonnes(lignes: number, colonnes: number): RegionUnicite[] {
  return Array.from({ length: colonnes }, (_, c) =>
    unicite('colonne', Array.from({ length: lignes }, (_, l) => l * colonnes + c)),
  );
}

/**
 * Blocs rectangulaires de hauteurBloc × largeurBloc dans une grille carrée de côté taille
 * (9x9 : blocs 3×3 ; 6x6 : blocs 2×3 ; 4x4 : blocs 2×2).
 */
export function regionsBlocs(taille: number, hauteurBloc: number, largeurBloc: number): RegionUnicite[] {
  if (taille % hauteurBloc !== 0 || taille % largeurBloc !== 0) {
    throw new Error(`Blocs ${hauteurBloc}×${largeurBloc} incompatibles avec une grille de ${taille}`);
  }
  const regions: RegionUnicite[] = [];
  for (let l0 = 0; l0 < taille; l0 += hauteurBloc) {
    for (let c0 = 0; c0 < taille; c0 += largeurBloc) {
      const cellules: Cellule[] = [];
      for (let l = l0; l < l0 + hauteurBloc; l++) {
        for (let c = c0; c < c0 + largeurBloc; c++) cellules.push(l * taille + c);
      }
      regions.push(unicite('bloc', cellules));
    }
  }
  return regions;
}

/** Les deux grandes diagonales d'une grille carrée (sudoku diagonal). */
export function regionsDiagonales(taille: number): RegionUnicite[] {
  return [
    unicite('diagonale', Array.from({ length: taille }, (_, i) => i * taille + i)),
    unicite('diagonale', Array.from({ length: taille }, (_, i) => i * taille + (taille - 1 - i))),
  ];
}

/**
 * Régions irrégulières à partir d'une carte : carte[cellule] = numéro de la région de la case
 * (numéros quelconques, ex. 0 à 8). Les régions sont rangées par numéro croissant.
 */
export function regionsIrregulieres(carte: readonly number[]): RegionUnicite[] {
  const parNumero = new Map<number, Cellule[]>();
  carte.forEach((numero, cellule) => {
    const cellules = parNumero.get(numero);
    if (cellules) cellules.push(cellule);
    else parNumero.set(numero, [cellule]);
  });
  return [...parNumero.keys()]
    .sort((a, b) => a - b)
    .map((numero) => unicite('irreguliere', parNumero.get(numero) ?? []));
}

/** Cage de somme imposée ; par défaut ses valeurs doivent être distinctes (règle du Killer). */
export function cage(cellules: readonly Cellule[], total: number, distinctes = true): RegionSomme {
  return { type: 'somme', forme: 'cage', cellules: [...cellules], total, distinctes };
}

/** Lignes + colonnes + blocs : les régions du sudoku classique. */
export function regionsClassiques(taille: number, hauteurBloc: number, largeurBloc: number): Region[] {
  return [
    ...regionsLignes(taille, taille),
    ...regionsColonnes(taille, taille),
    ...regionsBlocs(taille, hauteurBloc, largeurBloc),
  ];
}

/** Valeurs 1 à n. */
export function valeursUnA(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

/** Définition complète d'un sudoku classique (ex. definitionClassique(9, 3, 3)). */
export function definitionClassique(taille: number, hauteurBloc: number, largeurBloc: number): DefinitionGrille {
  return {
    lignes: taille,
    colonnes: taille,
    valeurs: valeursUnA(taille),
    regions: regionsClassiques(taille, hauteurBloc, largeurBloc),
    domaines: null,
  };
}

/**
 * Zones (Tectonic, étape 7a) à partir d'une carte : carte[cellule] = numéro de la zone de la case.
 * Rangées par numéro croissant. Une zone de N cases contient les valeurs 1 à N (voir domainesZones).
 */
export function regionsZones(carte: readonly number[]): RegionUnicite[] {
  return regionsIrregulieres(carte).map((region) => unicite('zone', [...region.cellules]));
}

/**
 * Domaines des cases d'après leur zone : une case d'une zone de N cases accepte les valeurs 1 à N
 * (masques de bits, voir DefinitionGrille.domaines).
 */
export function domainesZones(carte: readonly number[]): number[] {
  const tailles = new Map<number, number>();
  for (const numero of carte) tailles.set(numero, (tailles.get(numero) ?? 0) + 1);
  return carte.map((numero) => (1 << (tailles.get(numero) ?? 0)) - 1);
}

/**
 * Tous les carrés 2×2 d'une grille (régions d'unicité « non complètes ») : deux cases qui se touchent,
 * par un côté ou en diagonale, sont toujours dans un même carré 2×2. Déclarer ces carrés interdit donc
 * le même chiffre dans deux cases voisines. Cases d'un carré : haut gauche, haut droite, bas gauche, bas droite.
 */
export function regionsCarres(lignes: number, colonnes: number): RegionUnicite[] {
  const regions: RegionUnicite[] = [];
  for (let l = 0; l + 1 < lignes; l++) {
    for (let c = 0; c + 1 < colonnes; c++) {
      const hautGauche = l * colonnes + c;
      regions.push(unicite('carre', [hautGauche, hautGauche + 1, hautGauche + colonnes, hautGauche + colonnes + 1]));
    }
  }
  return regions;
}
