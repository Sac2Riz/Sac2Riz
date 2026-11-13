import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { xyzWing } from '../../../../src/moteur/logique/techniques/xyz-wing.ts';
import { yWing } from '../../../../src/moteur/logique/techniques/y-wing.ts';
import { ctx9, eliminations, etatVide, fixer, motif } from '../aide.ts';

describe('xyz-wing', () => {
  test('pivot L2C2 {1,2,3}, pinces L2C7 {1,3} et L1C1 {2,3} : on retire 3 des cases qui voient les trois', () => {
    const etat = fixer(etatVide(), { L2C2: [1, 2, 3], L2C7: [1, 3], L1C1: [2, 3] });
    const etape = xyzWing.chercher(ctx9, etat);
    assert.deepEqual(motif(etape), ['L2C2', 'L1C1', 'L2C7']);
    assert.deepEqual(eliminations(etape), { L2C1: [3], L2C3: [3] });
    assert.equal(etape?.niveau, 'expert');
    assert.equal(yWing.chercher(ctx9, etat), null);
  });

  test('rien si le pivot a quatre candidats', () => {
    assert.equal(xyzWing.chercher(ctx9, fixer(etatVide(), { L2C2: [1, 2, 3, 4], L2C7: [1, 3], L1C1: [2, 3] })), null);
  });
});
