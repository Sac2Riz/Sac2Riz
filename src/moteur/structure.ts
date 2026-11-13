// « Compilation » d'une DefinitionGrille : vérifie qu'elle est cohérente et précalcule,
// une fois pour toutes, les tables dont les solveurs ont besoin à chaque étape.
// Les tables sont des tableaux typés (Int32Array…), plus rapides que des tableaux ordinaires. Code pur.

import type { DefinitionGrille } from '../types/grille.ts';
import { masqueComplet, VALEUR_MAX } from './candidats.ts';

/** Version « prête au calcul » d'une définition de grille. Ne pas modifier ses tableaux. */
export type Structure = {
  readonly definition: DefinitionGrille;
  readonly nombreCellules: number;
  /** Valeurs autorisées, triées par ordre croissant. */
  readonly valeurs: readonly number[];
  /** Masque de toutes les valeurs autorisées. */
  readonly masqueValeurs: number;
  /** Cases de chaque région (même ordre que definition.regions). */
  readonly cellulesRegion: readonly Int32Array[];
  /** Indices des régions contenant chaque case. */
  readonly regionsCellule: readonly Int32Array[];
  /** 1 si les valeurs de la région doivent être distinctes (unicité, ou cage « distinctes »). */
  readonly distincte: Uint8Array;
  /** Somme imposée de la région, ou -1 s'il n'y en a pas. */
  readonly total: Int32Array;
  /** 1 si la case appartient à au moins une région somme (évite des calculs inutiles). */
  readonly dansUneSomme: Uint8Array;
};

/** Somme des k plus petites (ou plus grandes) valeurs d'une liste triée. */
function sommeExtreme(valeurs: readonly number[], k: number, plusGrandes: boolean): number {
  let somme = 0;
  for (let i = 0; i < k; i++) {
    // Le « ?? 0 » ne sert jamais : l'appelant garantit k <= valeurs.length
    somme += (plusGrandes ? valeurs[valeurs.length - 1 - i] : valeurs[i]) ?? 0;
  }
  return somme;
}

/** Vérifie la définition et précalcule ses tables. Lève une erreur si la définition est incohérente. */
export function compiler(definition: DefinitionGrille): Structure {
  const { lignes, colonnes, regions } = definition;
  if (!Number.isInteger(lignes) || !Number.isInteger(colonnes) || lignes < 1 || colonnes < 1) {
    throw new Error(`Dimensions invalides : ${lignes}×${colonnes}`);
  }
  const valeurs = [...definition.valeurs].sort((a, b) => a - b);
  if (valeurs.length === 0) throw new Error('Aucune valeur autorisée');
  valeurs.forEach((v, i) => {
    if (!Number.isInteger(v) || v < 1 || v > VALEUR_MAX) {
      throw new Error(`Valeur ${v} hors de [1, ${VALEUR_MAX}]`);
    }
    if (i > 0 && valeurs[i - 1] === v) throw new Error(`Valeur ${v} en double`);
  });

  const nombreCellules = lignes * colonnes;
  const listesParCellule: number[][] = Array.from({ length: nombreCellules }, () => []);
  const distincte = new Uint8Array(regions.length);
  const total = new Int32Array(regions.length).fill(-1);
  const dansUneSomme = new Uint8Array(nombreCellules);

  const cellulesRegion = regions.map((region, r) => {
    const vues = new Set<number>();
    for (const c of region.cellules) {
      if (!Number.isInteger(c) || c < 0 || c >= nombreCellules) {
        throw new Error(`Région ${r} : case ${c} hors de la grille`);
      }
      if (vues.has(c)) throw new Error(`Région ${r} : case ${c} en double`);
      vues.add(c);
      // Le « ! » est sûr : c a été vérifiée dans [0, nombreCellules[
      listesParCellule[c]!.push(r);
    }
    if (region.type === 'unicite') {
      distincte[r] = 1;
      if (region.cellules.length > valeurs.length) {
        throw new Error(`Région ${r} : ${region.cellules.length} cases pour ${valeurs.length} valeurs distinctes`);
      }
    } else {
      distincte[r] = region.distinctes ? 1 : 0;
      total[r] = region.total;
      for (const c of region.cellules) dansUneSomme[c] = 1;
      const k = region.cellules.length;
      const min = region.distinctes ? sommeExtreme(valeurs, k, false) : k * (valeurs[0] ?? 0);
      const max = region.distinctes ? sommeExtreme(valeurs, k, true) : k * (valeurs[valeurs.length - 1] ?? 0);
      if (region.distinctes && k > valeurs.length) {
        throw new Error(`Cage ${r} : ${k} cases pour ${valeurs.length} valeurs distinctes`);
      }
      if (!Number.isInteger(region.total) || region.total < min || region.total > max) {
        throw new Error(`Cage ${r} : total ${region.total} impossible (entre ${min} et ${max})`);
      }
    }
    return Int32Array.from(region.cellules);
  });

  return {
    definition,
    nombreCellules,
    valeurs,
    masqueValeurs: masqueComplet(valeurs),
    cellulesRegion,
    regionsCellule: listesParCellule.map((liste) => Int32Array.from(liste)),
    distincte,
    total,
    dansUneSomme,
  };
}
