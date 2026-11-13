import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { tripletNu } from '../../../../src/moteur/logique/techniques/triplet-nu.ts';
import { cases, ctx9, eliminations, etatVide, fixer, motif, partout } from '../aide.ts';

const sauf = (noms: readonly string[], exclus: readonly string[]): string[] => noms.filter((n) => !exclus.includes(n));
const ligne1 = cases('L1', 1, 9);

describe('triplet-nu', () => {
  test('{1,2}, {2,3}, {1,3} dans une ligne', () => {
    const etape = tripletNu.chercher(ctx9, fixer(etatVide(), { L1C1: [1, 2], L1C2: [2, 3], L1C5: [1, 3] }));
    assert.deepEqual(motif(etape), ['L1C1', 'L1C2', 'L1C5']);
    assert.deepEqual(eliminations(etape), partout(sauf(ligne1, ['L1C1', 'L1C2', 'L1C5']), [1, 2, 3]));
    assert.equal(etape?.niveau, 'difficile');
  });

  test('rien si les trois cases ont quatre candidats à elles trois', () => {
    assert.equal(tripletNu.chercher(ctx9, fixer(etatVide(), { L1C1: [1, 2], L1C2: [2, 3], L1C5: [1, 4] })), null);
  });
});
