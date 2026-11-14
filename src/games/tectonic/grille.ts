// STRUCTURE d'une grille de Tectonic, déduite de ses dimensions et de sa carte des zones :
// définition pour le moteur (zones = régions complètes, carrés 2×2 = cases qui se touchent,
// domaine 1..N de chaque case), contexte du solveur logique, tailles des zones, voisines et
// bordures. Calculée une fois par carte (cache WeakMap indexé par le tableau des zones). Code pur.

import { creerContexteAvec, type Contexte } from '../../moteur/logique/contexte.ts';
import { domainesZones, regionsCarres, regionsZones, valeursUnA } from '../../moteur/regions.ts';
import { compiler } from '../../moteur/structure.ts';
import type { DefinitionGrille } from '../../types/grille.ts';
import { bordures, casesAutour, cellulesDesZones, type Bordure } from './geometrie.ts';

export type StructureTectonic = {
  readonly lignes: number;
  readonly colonnes: number;
  readonly zones: readonly number[];
  readonly definition: DefinitionGrille;
  readonly contexte: Contexte;
  /** Cases de chaque zone (indice = numéro de zone). */
  readonly cellulesZones: readonly (readonly number[])[];
  /** Taille de la zone de chaque case : la case accepte les chiffres 1 à cette taille. */
  readonly tailleCase: readonly number[];
  /** Plus grande zone de la grille (= plus grand chiffre). */
  readonly tailleMax: number;
  /** Pour chaque case : les cases qui la touchent et celles de sa zone (sans elle), triées. */
  readonly voisines: readonly (readonly number[])[];
  /** Côtés épais de chaque case (vue). */
  readonly bordures: readonly Bordure[];
};

/** Définition de la grille pour le moteur. La carte doit être valide (zones d'un seul tenant). */
export function definitionTectonic(lignes: number, colonnes: number, zones: readonly number[]): DefinitionGrille {
  const tailleMax = Math.max(...cellulesDesZones(zones).map((z) => z.length));
  return {
    lignes,
    colonnes,
    valeurs: valeursUnA(tailleMax),
    regions: [...regionsZones(zones), ...regionsCarres(lignes, colonnes)],
    domaines: domainesZones(zones),
  };
}

const cache = new WeakMap<readonly number[], StructureTectonic>();

/** Structure d'une grille (calculée une fois par tableau de zones). */
export function structureTectonic(lignes: number, colonnes: number, zones: readonly number[]): StructureTectonic {
  const connue = cache.get(zones);
  if (connue !== undefined && connue.lignes === lignes && connue.colonnes === colonnes) return connue;
  const definition = definitionTectonic(lignes, colonnes, zones);
  const cellulesZones = cellulesDesZones(zones);
  const tailleCase = zones.map((z) => cellulesZones[z]?.length ?? 0);
  const voisines = zones.map((z, cellule) =>
    [...new Set([...casesAutour(lignes, colonnes, cellule), ...(cellulesZones[z] ?? [])])]
      .filter((v) => v !== cellule)
      .sort((a, b) => a - b),
  );
  const structure: StructureTectonic = {
    lignes,
    colonnes,
    zones,
    definition,
    contexte: creerContexteAvec(compiler(definition)),
    cellulesZones,
    tailleCase,
    tailleMax: Math.max(...tailleCase),
    voisines,
    bordures: bordures(lignes, colonnes, zones),
  };
  cache.set(zones, structure);
  return structure;
}

/** Structure de la grille de données D (voir structureTectonic). */
export function structureDe(donnees: {
  readonly lignes: number;
  readonly colonnes: number;
  readonly zones: readonly number[];
}): StructureTectonic {
  return structureTectonic(donnees.lignes, donnees.colonnes, donnees.zones);
}

/** Chiffres autorisés dans une case (1 à la taille de sa zone) : pour griser le pavé (étape 7b). */
export function valeursAutorisees(structure: StructureTectonic, cellule: number): number[] {
  return valeursUnA(structure.tailleCase[cellule] ?? 0);
}
