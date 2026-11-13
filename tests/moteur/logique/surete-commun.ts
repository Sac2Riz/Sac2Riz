// Test de sûreté du solveur logique, partagé par la version rapide (npm test) et la version
// longue (npm run test:long). Sur des grilles générées avec des graines fixes, chaque placement
// et chaque élimination est comparé à la solution unique trouvée par le backtracking :
// aucune technique ne doit placer un mauvais chiffre ni éliminer le bon.

import assert from 'node:assert/strict';
import { compterSolutionsAvec } from '../../../src/moteur/backtracking.ts';
import { genererGrille, retirerChiffres } from '../../../src/moteur/generateur.ts';
import { creerContexte, type Contexte } from '../../../src/moteur/logique/contexte.ts';
import { aDesEffets, appliquerEtape, estRemplie, etatInitial } from '../../../src/moteur/logique/etat.ts';
import { nomCellule } from '../../../src/moteur/logique/noms.ts';
import { prochaineEtape } from '../../../src/moteur/logique/solveur.ts';
import type { Technique } from '../../../src/moteur/logique/technique.ts';
import { TECHNIQUES } from '../../../src/moteur/logique/techniques/index.ts';
import { definitionClassique, regionsColonnes, regionsIrregulieres, regionsLignes, valeursUnA } from '../../../src/moteur/regions.ts';
import type { DefinitionGrille, ValeursGrille } from '../../../src/types/grille.ts';
import type { StatutLogique } from '../../../src/types/logique.ts';
import { creerAlea } from '../../../src/utils/alea.ts';
import { def9, defDiagonal } from './aide.ts';
import { SOLUTION_UNIQUE } from '../grilles-connues.ts';

/**
 * Carte d'un sudoku irrégulier (numéro de région de chaque case, ligne par ligne).
 * Construite à partir des blocs classiques en échangeant des cases portant le même chiffre
 * dans SOLUTION_UNIQUE : cette solution reste donc valable (vérifié par un test), ce qui
 * garantit que la carte admet des grilles. Carte de test : ses régions ne sont pas toutes d'un seul tenant.
 */
export const CARTE_IRREGULIERE = [
  ...'310111222000111222000011222303444555333844555333444455666777858766777888666677888',
].map(Number);

export const defIrreguliere: DefinitionGrille = {
  lignes: 9,
  colonnes: 9,
  valeurs: valeursUnA(9),
  regions: [...regionsLignes(9, 9), ...regionsColonnes(9, 9), ...regionsIrregulieres(CARTE_IRREGULIERE)],
};

export const def6 = definitionClassique(6, 2, 3);

export type Bilan = {
  readonly statuts: Record<StatutLogique, number>;
  /** Nombre d'utilisations de chaque technique. */
  readonly usages: Map<string, number>;
};

/** Résout la grille pas à pas en contrôlant chaque étape ; lève une erreur qui nomme la technique fautive. */
export function verifierGrille(
  ctx: Contexte,
  enonce: ValeursGrille,
  solution: ValeursGrille,
  etiquette: string,
  bilan: Bilan,
  techniques: readonly Technique[] = TECHNIQUES,
): void {
  // La solution de référence est celle du backtracking (et l'énoncé doit être à solution unique)
  const reference = compterSolutionsAvec(ctx.structure, enonce, { limite: 2 });
  assert.equal(reference.nombre, 1, `[${etiquette}] énoncé non unique`);
  assert.deepEqual(reference.solution, [...solution], `[${etiquette}] solution différente du backtracking`);

  let etat = etatInitial(ctx, enonce);
  for (let numero = 1; ; numero++) {
    if (estRemplie(etat)) {
      bilan.statuts.resolu++;
      return;
    }
    const etape = prochaineEtape(ctx, etat, techniques);
    if (etape === null) {
      bilan.statuts.bloque++;
      return;
    }
    const fautive = (detail: string): string =>
      `[${etiquette}] Technique « ${etape.technique} » fautive à l'étape ${numero} : ${detail}. ` +
      `Explication : ${etape.explication}`;
    assert.ok(aDesEffets(etat, etape), fautive('étape sans effet'));
    for (const { cellule, valeur } of etape.placements) {
      const attendu = solution[cellule] ?? 0;
      assert.equal(valeur, attendu, fautive(`place ${valeur} en ${nomCellule(ctx, cellule)} au lieu de ${attendu}`));
    }
    for (const { cellule, valeurs } of etape.eliminations) {
      const bon = solution[cellule] ?? 0;
      assert.ok(!valeurs.includes(bon), fautive(`élimine le bon chiffre ${bon} de ${nomCellule(ctx, cellule)}`));
    }
    bilan.usages.set(etape.technique, (bilan.usages.get(etape.technique) ?? 0) + 1);
    etat = appliquerEtape(ctx, etat, etape);
  }
}

export function nouveauBilan(): Bilan {
  return { statuts: { resolu: 0, bloque: 0, contradiction: 0 }, usages: new Map() };
}

/** Vérifie les grilles générées avec les graines premiere … derniere. */
export function verifierGenerees(
  nom: string,
  definition: DefinitionGrille,
  premiere: number,
  derniere: number,
  bilan: Bilan,
): void {
  const ctx = creerContexte(definition);
  for (let graine = premiere; graine <= derniere; graine++) {
    const { enonce, solution } = genererGrille(definition, creerAlea(graine));
    verifierGrille(ctx, enonce, solution, `${nom}, graine ${graine}`, bilan);
  }
}

/**
 * Sudoku irrégulier : la génération d'une grille complète par backtracking y est parfois très lente.
 * On part donc de SOLUTION_UNIQUE (valable pour la carte), avec les chiffres permutés au hasard,
 * puis on retire des chiffres : rapide et varié.
 */
export function verifierIrregulieres(premiere: number, derniere: number, bilan: Bilan): void {
  const ctx = creerContexte(defIrreguliere);
  for (let graine = premiere; graine <= derniere; graine++) {
    const alea = creerAlea(graine);
    const permutation = alea.melanger(valeursUnA(9));
    const solution = SOLUTION_UNIQUE.map((v) => permutation[v - 1] ?? 0);
    const enonce = retirerChiffres(defIrreguliere, solution, alea);
    verifierGrille(ctx, enonce, solution, `irrégulier, graine ${graine}`, bilan);
  }
}

export { def9, defDiagonal };
