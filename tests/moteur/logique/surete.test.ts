// Test de sûreté (version rapide, lancée par npm test / npm run check).
// La version longue (milliers de grilles + couverture de chaque technique) : npm run test:long.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Technique } from '../../../src/moteur/logique/technique.ts';
import { estSolution } from '../../../src/moteur/validation.ts';
import { ENONCE_UNIQUE, SOLUTION_UNIQUE } from '../grilles-connues.ts';
import { ctx9 } from './aide.ts';
import {
  CARTE_IRREGULIERE,
  def6,
  def9,
  defDiagonal,
  defIrreguliere,
  nouveauBilan,
  verifierGenerees,
  verifierGrille,
  verifierIrregulieres,
} from './surete-commun.ts';

describe('sûreté du solveur logique (comparaison avec le backtracking)', () => {
  test('carte irrégulière de test : 9 régions de 9 cases, compatible avec SOLUTION_UNIQUE', () => {
    for (let r = 0; r < 9; r++) assert.equal(CARTE_IRREGULIERE.filter((x) => x === r).length, 9);
    assert.ok(estSolution(defIrreguliere, SOLUTION_UNIQUE));
  });

  test('sudoku classique 9x9 : 150 grilles', () => {
    const bilan = nouveauBilan();
    verifierGenerees('classique', def9, 1, 150, bilan);
    // La plupart des grilles minimales se résolvent par la logique ; quelques-unes restent bloquées
    assert.ok(bilan.statuts.resolu > 120, `${bilan.statuts.resolu} grilles résolues`);
  });

  test('sudoku diagonal : 30 grilles', () => {
    verifierGenerees('diagonal', defDiagonal, 1, 30, nouveauBilan());
  });

  test('sudoku irrégulier : 30 grilles', () => {
    verifierIrregulieres(1, 30, nouveauBilan());
  });

  test("une technique fautive est nommée dans le message d'erreur", () => {
    // Technique volontairement fausse : place 1 dans la première case vide
    const fautive: Technique = {
      id: 'singleton-nu',
      niveau: 'facile',
      nom: 'Fautive',
      chercher: (_ctx, etat) => {
        const cellule = etat.valeurs.indexOf(0);
        return {
          technique: 'singleton-nu',
          niveau: 'facile',
          cellules: [cellule],
          candidatsMotif: [],
          regions: [],
          placements: [{ cellule, valeur: 1 }],
          eliminations: [],
          explication: 'Placement au hasard.',
        };
      },
    };
    // Dans ENONCE_UNIQUE, la première case vide (L1C3) doit recevoir 4, pas 1
    assert.throws(
      () => verifierGrille(ctx9, ENONCE_UNIQUE, SOLUTION_UNIQUE, 'test', nouveauBilan(), [fautive]),
      /Technique « singleton-nu » fautive à l'étape 1 : place 1 en L1C3 au lieu de 4/,
    );
  });

  test('sudoku 6x6 : 60 grilles', () => {
    const bilan = nouveauBilan();
    verifierGenerees('6x6', def6, 1, 60, bilan);
    assert.ok(bilan.statuts.resolu > 50);
  });
});
