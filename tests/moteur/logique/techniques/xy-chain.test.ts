import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { xyChain } from '../../../../src/moteur/logique/techniques/xy-chain.ts';
import { yWing } from '../../../../src/moteur/logique/techniques/y-wing.ts';
import { ctx9, eliminations, etatVide, fixer, motif } from '../aide.ts';

// L1C1 {1,2} - L1C6 {2,3} - L5C6 {3,4} - L5C9 {4,1}
const etat = fixer(etatVide(), { L1C1: [1, 2], L1C6: [2, 3], L5C6: [3, 4], L5C9: [1, 4] });

describe('xy-chain', () => {
  test('chaîne de 4 cases : L1C1 ou L5C9 vaut 1', () => {
    const etape = xyChain.chercher(ctx9, etat);
    assert.deepEqual(motif(etape), ['L1C1', 'L1C6', 'L5C6', 'L5C9']);
    assert.deepEqual(eliminations(etape), { L1C9: [1], L5C1: [1] });
    assert.equal(etape?.niveau, 'diabolique');
    assert.match(etape?.explication ?? '', /^Chaîne XY : L1C1 \(1→2\) - L1C6 \(2→3\) - L5C6 \(3→4\) - L5C9 \(4→1\)\./);
    assert.equal(yWing.chercher(ctx9, etat), null);
  });

  test('rien si la dernière case ne ramène pas au chiffre de départ', () => {
    assert.equal(xyChain.chercher(ctx9, fixer(etat, { L5C9: [4, 5] })), null);
  });
});
