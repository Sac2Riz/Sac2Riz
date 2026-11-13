import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { quadrupletNu } from '../../../../src/moteur/logique/techniques/quadruplet-nu.ts';
import { cases, ctx9, eliminations, etatVide, fixer, motif, partout } from '../aide.ts';

const sauf = (noms: readonly string[], exclus: readonly string[]): string[] => noms.filter((n) => !exclus.includes(n));
const ligne1 = cases('L1', 1, 9);

describe('quadruplet-nu', () => {
  test('{1,2}, {2,3}, {3,4}, {1,4} dans une ligne', () => {
    const etat = fixer(etatVide(), { L1C1: [1, 2], L1C2: [2, 3], L1C5: [3, 4], L1C8: [1, 4] });
    const etape = quadrupletNu.chercher(ctx9, etat);
    assert.deepEqual(motif(etape), ['L1C1', 'L1C2', 'L1C5', 'L1C8']);
    assert.deepEqual(eliminations(etape), partout(sauf(ligne1, ['L1C1', 'L1C2', 'L1C5', 'L1C8']), [1, 2, 3, 4]));
  });

  test('rien si les quatre cases ont cinq candidats à elles quatre', () => {
    const etat = fixer(etatVide(), { L1C1: [1, 2], L1C2: [2, 3], L1C5: [3, 4], L1C8: [1, 5] });
    assert.equal(quadrupletNu.chercher(ctx9, etat), null);
  });
});
