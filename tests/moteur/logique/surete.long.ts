// Test de sûreté — VERSION LONGUE (npm run test:long, environ une minute).
// Même contrôle que surete.test.ts sur beaucoup plus de grilles, plus un contrôle de couverture :
// chaque technique doit servir au moins une fois sur de vraies grilles.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { IDS_TECHNIQUES } from '../../../src/types/logique.ts';
import { def6, def9, defDiagonal, nouveauBilan, verifierGenerees, verifierIrregulieres } from './surete-commun.ts';

/**
 * Le quadruplet caché n'est jamais indispensable en pratique : dans une région à n cases vides,
 * il équivaut à un sous-ensemble nu de n − 4 cases, trouvé avant lui dès que n − 4 ≤ 4.
 * Il n'est testé que sur des états préparés à la main (quadruplet-cache.test.ts).
 */
const EXEMPTEES = new Set(['quadruplet-cache']);

describe('sûreté du solveur logique — version longue', () => {
  const bilan = nouveauBilan();

  test('sudoku classique 9x9 : 3000 grilles', () => {
    verifierGenerees('classique', def9, 1, 3000, bilan);
  });

  test('sudoku diagonal : 300 grilles', () => {
    verifierGenerees('diagonal', defDiagonal, 1, 300, bilan);
  });

  test('sudoku irrégulier : 300 grilles', () => {
    verifierIrregulieres(1, 300, bilan);
  });

  test('sudoku 6x6 : 500 grilles', () => {
    verifierGenerees('6x6', def6, 1, 500, bilan);
  });

  test('couverture : chaque technique a servi au moins une fois', () => {
    const absentes = IDS_TECHNIQUES.filter((id) => !EXEMPTEES.has(id) && !bilan.usages.has(id));
    assert.deepEqual(absentes, [], `techniques jamais utilisées : ${absentes.join(', ')}`);
    console.log('Utilisations :', Object.fromEntries(bilan.usages), 'Statuts :', bilan.statuts);
  });
});
