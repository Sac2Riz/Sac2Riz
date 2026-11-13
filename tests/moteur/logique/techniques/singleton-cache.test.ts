import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { singletonCache } from '../../../../src/moteur/logique/techniques/singleton-cache.ts';
import { cases, ctx9, ctxDiagonal, etatVide, placements, retirerSauf } from '../aide.ts';

/** État où, dans la ligne 1, le 7 n'a plus que la place L1C5 (mais plusieurs places dans chaque bloc). */
const etatLigne = retirerSauf(etatVide(), [cases('L1', 1, 9)], 7, ['L1C5']);

describe('singleton-cache', () => {
  test('dans une ligne', () => {
    const etape = singletonCache.chercher(ctx9, etatLigne);
    assert.deepEqual(placements(etape), { L1C5: 7 });
    assert.deepEqual(etape?.regions, [0]);
  });

  test('dans une diagonale (sudoku diagonal)', () => {
    const diagonale = ['L1C1', 'L2C2', 'L3C3', 'L4C4', 'L5C5', 'L6C6', 'L7C7', 'L8C8', 'L9C9'];
    const etat = retirerSauf(etatVide(ctxDiagonal), [diagonale], 3, ['L5C5'], ctxDiagonal);
    const etape = singletonCache.chercher(ctxDiagonal, etat);
    assert.deepEqual(placements(etape, ctxDiagonal), { L5C5: 3 });
    assert.deepEqual(etape?.regions, [27]);
    assert.match(etape?.explication ?? '', /^La diagonale ↘ : le 3/);
  });

  test('rien sans singleton caché', () => {
    assert.equal(singletonCache.chercher(ctx9, etatVide()), null);
  });
});
