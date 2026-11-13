import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { singletonNu } from '../../../../src/moteur/logique/techniques/singleton-nu.ts';
import { ctx9, etatVide, fixer, placements } from '../aide.ts';

describe('singleton-nu', () => {
  test("une case qui n'a plus qu'un candidat", () => {
    const etape = singletonNu.chercher(ctx9, fixer(etatVide(), { L4C6: [3] }));
    assert.deepEqual(placements(etape), { L4C6: 3 });
    assert.equal(etape?.niveau, 'facile');
    assert.equal(etape?.explication, "L4C6 n'a plus qu'un candidat possible : le 3. On place le 3 en L4C6.");
  });

  test('rien quand toutes les cases ont plusieurs candidats', () => {
    assert.equal(singletonNu.chercher(ctx9, fixer(etatVide(), { L4C6: [3, 8] })), null);
  });
});
