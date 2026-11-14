// Contexte du solveur logique : tables précalculées une fois pour toutes à partir de la
// Structure du moteur (quelles cases se voient, quelles régions sont « complètes »…).
// Les techniques ne connaissent que ces tables : elles fonctionnent donc sur toutes les
// variantes décrites par des régions (classique, diagonal, irrégulier, 6x6…). Code pur.

import type { Cellule, DefinitionGrille, FormeUnicite } from '../../types/grille.ts';
import { compterBits } from '../candidats.ts';
import { compiler, type Structure } from '../structure.ts';

/** Forme d'une région, cages comprises. */
export type FormeRegion = FormeUnicite | 'cage';

export type Contexte = {
  readonly structure: Structure;
  readonly nombreCellules: number;
  /** Nombre de colonnes de la grille (pour nommer les cases « L3C5 »). */
  readonly colonnes: number;
  /** Masque de toutes les valeurs autorisées. */
  readonly masqueValeurs: number;
  /** Domaine de chaque case (masque ; masqueValeurs partout pour un sudoku). */
  readonly domaine: Int32Array;
  /** Valeurs possibles de chaque région (réunion des domaines de ses cases ; masqueValeurs pour un sudoku). */
  readonly valeursRegion: Int32Array;
  /** Indices des régions à chiffres distincts : les seules utilisées par les techniques. */
  readonly regionsDistinctes: readonly number[];
  /**
   * 1 si la région a des chiffres distincts ET autant de cases que de valeurs possibles (valeursRegion) :
   * chaque valeur y figure alors exactement une fois. Les singletons cachés, les
   * sous-ensembles cachés et les liens forts ne sont valables que dans ces régions.
   */
  readonly complete: Uint8Array;
  readonly formes: readonly FormeRegion[];
  /** Numéro (à partir de 1) de la région parmi celles de même forme, pour les explications. */
  readonly rangs: readonly number[];
  /** Pour chaque case, les cases qui la « voient » (au moins une région distincte commune), sans elle-même. */
  readonly voisins: readonly Int32Array[];
  /** Matrice nombreCellules × nombreCellules : voit[a * nombreCellules + b] = 1 si a et b se voient. */
  readonly voit: Uint8Array;
  /** membre[r][c] = 1 si la case c appartient à la région r. */
  readonly membre: readonly Uint8Array[];
};

/** Précalcule le contexte à partir d'une structure déjà compilée. */
export function creerContexteAvec(structure: Structure): Contexte {
  const { definition, nombreCellules, cellulesRegion, distincte } = structure;
  const nombreRegions = cellulesRegion.length;

  const regionsDistinctes: number[] = [];
  const complete = new Uint8Array(nombreRegions);
  const formes: FormeRegion[] = [];
  const rangs: number[] = [];
  const compteurs = new Map<FormeRegion, number>();
  const membre: Uint8Array[] = [];
  const voit = new Uint8Array(nombreCellules * nombreCellules);

  definition.regions.forEach((region, r) => {
    const forme: FormeRegion = region.type === 'unicite' ? region.forme : 'cage';
    const rang = (compteurs.get(forme) ?? 0) + 1;
    compteurs.set(forme, rang);
    formes.push(forme);
    rangs.push(rang);

    const cellules = cellulesRegion[r] ?? new Int32Array(0);
    const appartient = new Uint8Array(nombreCellules);
    for (const c of cellules) appartient[c] = 1;
    membre.push(appartient);

    if (distincte[r] !== 1) return;
    regionsDistinctes.push(r);
    if (cellules.length === compterBits(structure.valeursRegion[r] ?? 0)) complete[r] = 1;
    for (const a of cellules) {
      for (const b of cellules) if (a !== b) voit[a * nombreCellules + b] = 1;
    }
  });

  const voisins: Int32Array[] = [];
  for (let a = 0; a < nombreCellules; a++) {
    const liste: Cellule[] = [];
    for (let b = 0; b < nombreCellules; b++) if (voit[a * nombreCellules + b] === 1) liste.push(b);
    voisins.push(Int32Array.from(liste));
  }

  return {
    structure,
    nombreCellules,
    colonnes: definition.colonnes,
    masqueValeurs: structure.masqueValeurs,
    domaine: structure.domaine,
    valeursRegion: structure.valeursRegion,
    regionsDistinctes,
    complete,
    formes,
    rangs,
    voisins,
    voit,
    membre,
  };
}

/** Compile la définition puis précalcule le contexte. */
export function creerContexte(definition: DefinitionGrille): Contexte {
  return creerContexteAvec(compiler(definition));
}

/** Vrai si les cases a et b se voient (a ≠ b et au moins une région distincte commune). */
export function seVoient(ctx: Contexte, a: Cellule, b: Cellule): boolean {
  return ctx.voit[a * ctx.nombreCellules + b] === 1;
}

/** Cases d'une région. */
export function cellulesDe(ctx: Contexte, region: number): Int32Array {
  return ctx.structure.cellulesRegion[region] ?? new Int32Array(0);
}

/** Vrai si la case appartient à la région. */
export function estDans(ctx: Contexte, region: number, cellule: Cellule): boolean {
  return ctx.membre[region]?.[cellule] === 1;
}

/** Régions complètes dont la forme fait partie de la liste (null = toutes les formes). */
export function regionsCompletes(ctx: Contexte, formes: readonly FormeRegion[] | null): number[] {
  return ctx.regionsDistinctes.filter(
    (r) => ctx.complete[r] === 1 && (formes === null || formes.includes(ctx.formes[r] ?? 'cage')),
  );
}

/**
 * Première région distincte (d'une des formes demandées, null = toutes) contenant toutes les cases
 * de la liste, en ignorant la région « sauf » ; -1 s'il n'y en a pas.
 */
export function regionCommune(
  ctx: Contexte,
  cellules: readonly Cellule[],
  formes: readonly FormeRegion[] | null,
  sauf = -1,
): number {
  const premiere = cellules[0];
  if (premiere === undefined) return -1;
  for (const r of ctx.structure.regionsCellule[premiere] ?? []) {
    if (r === sauf || ctx.structure.distincte[r] !== 1) continue;
    if (formes !== null && !formes.includes(ctx.formes[r] ?? 'cage')) continue;
    if (cellules.every((c) => estDans(ctx, r, c))) return r;
  }
  return -1;
}
