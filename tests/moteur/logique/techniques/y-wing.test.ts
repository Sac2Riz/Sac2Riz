import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { yWing } from '../../../../src/moteur/logique/techniques/y-wing.ts';
import { ctx9, eliminations, etatVide, fixer, motif } from '../aide.ts';

describe('y-wing', () => {
  test('pivot L1C1 {1,2}, pinces L1C5 {1,3} et L5C1 {2,3} : on retire 3 de L5C5', () => {
    const etape = yWing.chercher(ctx9, fixer(etatVide(), { L1C1: [1, 2], L1C5: [1, 3], L5C1: [2, 3] }));
    assert.deepEqual(motif(etape), ['L1C1', 'L1C5', 'L5C1']);
    assert.deepEqual(eliminations(etape), { L5C5: [3] });
    assert.equal(etape?.niveau, 'expert');
    assert.match(etape?.explication ?? '', /^Y-Wing : le pivot L1C1 \{1, 2\} voit L1C5 \{1, 3\} et L5C1 \{2, 3\}/);
  });

  test('rien si les pinces ne partagent pas le même troisième chiffre', () => {
    assert.equal(yWing.chercher(ctx9, fixer(etatVide(), { L1C1: [1, 2], L1C5: [1, 3], L5C1: [2, 4] })), null);
  });

  test('motif sans effet ignoré', () => {
    const etat = fixer(etatVide(), { L1C1: [1, 2], L1C5: [1, 3], L5C1: [2, 3], L5C5: [4, 5, 6] });
    assert.equal(yWing.chercher(ctx9, etat), null);
  });
});
