// PROBLÈME vu par les solveurs : une grille (cases noires) + la liste des nombres à placer.
// Les nombres sont désignés par leur INDICE dans la liste triée (longueur, puis valeur). Code pur.
// Aussi : la « structure » d'une partie, déduite de ses données (grille, liste, solution).

import { grilleDe, nombreDe, type Grille } from './grille.ts';
import { NOIRE, type DonneesCases } from './types.ts';

export type Probleme = {
  readonly grille: Grille;
  /** Liste triée par longueur puis par valeur (pour une même longueur, ordre du texte = ordre numérique). */
  readonly nombres: readonly string[];
  /** Chiffres de chaque nombre. */
  readonly chiffres: readonly (readonly number[])[];
  /** Pour chaque emplacement : les nombres de sa longueur. */
  readonly nombresDeLongueur: readonly (readonly number[])[];
  /** Pour chaque emplacement : les autres emplacements de même longueur. */
  readonly memeLongueur: readonly (readonly number[])[];
  /** Longueurs présentes, croissantes, et emplacements / nombres de chacune. */
  readonly longueurs: readonly number[];
  readonly emplacementsParLongueur: ReadonlyMap<number, readonly number[]>;
  readonly nombresParLongueur: ReadonlyMap<number, readonly number[]>;
};

/** Trie une liste de nombres : par longueur, puis par valeur. */
export function trierNombres(nombres: readonly string[]): string[] {
  return [...nombres].sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
}

function grouper<T>(elements: readonly T[], cle: (e: T) => number): Map<number, T[]> {
  const groupes = new Map<number, T[]>();
  for (const e of elements) {
    const k = cle(e);
    const groupe = groupes.get(k);
    if (groupe === undefined) groupes.set(k, [e]);
    else groupe.push(e);
  }
  return groupes;
}

/** Prépare un problème. La liste doit avoir, pour chaque longueur, autant de nombres que d'emplacements. */
export function creerProbleme(grille: Grille, liste: readonly string[]): Probleme {
  const nombres = trierNombres(liste);
  const indices = nombres.map((_, i) => i);
  const nombresParLongueur = grouper(indices, (i) => nombres[i]?.length ?? 0);
  const emplacementsParLongueur = grouper(
    grille.emplacements.map((e) => e.id),
    (id) => grille.emplacements[id]?.cellules.length ?? 0,
  );
  const longueurs = [...emplacementsParLongueur.keys()].sort((a, b) => a - b);
  for (const l of new Set([...longueurs, ...nombresParLongueur.keys()])) {
    if ((emplacementsParLongueur.get(l) ?? []).length !== (nombresParLongueur.get(l) ?? []).length) {
      throw new Error(`Liste incompatible avec la grille (longueur ${l})`);
    }
  }
  const longueurDe = (id: number): number => grille.emplacements[id]?.cellules.length ?? 0;
  return {
    grille,
    nombres,
    chiffres: nombres.map((n) => [...n].map(Number)),
    nombresDeLongueur: grille.emplacements.map((e) => nombresParLongueur.get(e.cellules.length) ?? []),
    memeLongueur: grille.emplacements.map((e) =>
      (emplacementsParLongueur.get(longueurDe(e.id)) ?? []).filter((id) => id !== e.id),
    ),
    longueurs,
    emplacementsParLongueur,
    nombresParLongueur,
  };
}

/** Ce que l'on déduit des données d'une partie. */
export type Structure = {
  readonly probleme: Probleme;
  /** Nombre de la solution dans chaque emplacement (texte). */
  readonly solutionTexte: readonly string[];
  /** Nombre de la solution dans chaque emplacement (indice dans la liste). */
  readonly solution: readonly number[];
};

/**
 * Cache des structures : les données d'une partie ne changent jamais, on ne recalcule donc pas
 * la structure à chaque action. (Un WeakMap ne retient pas les données : pas de fuite de mémoire.)
 */
const CACHE = new WeakMap<DonneesCases, Structure>();

/** Grille seule (cases noires) des données. */
export function grilleDesDonnees(donnees: DonneesCases): Grille {
  return grilleDe(donnees.largeur, donnees.hauteur, donnees.solution.map((v) => v === NOIRE));
}

export function structureDe(donnees: DonneesCases): Structure {
  const connue = CACHE.get(donnees);
  if (connue !== undefined) return connue;
  const grille = grilleDesDonnees(donnees);
  const solutionTexte = grille.emplacements.map((e) => nombreDe(e, donnees.solution));
  const probleme = creerProbleme(grille, solutionTexte);
  const structure: Structure = {
    probleme,
    solutionTexte,
    solution: solutionTexte.map((t) => probleme.nombres.indexOf(t)),
  };
  CACHE.set(donnees, structure);
  return structure;
}
