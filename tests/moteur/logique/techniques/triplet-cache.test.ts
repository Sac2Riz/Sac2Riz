import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { tripletCache } from '../../../../src/moteur/logique/techniques/triplet-cache.ts';
import type { EtatLogique } from '../../../../src/types/logique.ts';
import { cases, ctx9, eliminations, etatVide, motif, partout, retirerSauf } from '../aide.ts';

const ligne1 = cases('L1', 1, 9);

/** Dans la ligne 1, chacune des valeurs ne peut aller que dans les cases données. */
function cachees(valeurs: readonly number[], places: readonly string[]): EtatLogique {
  return valeurs.reduce((etat, v) => retirerSauf(etat, [ligne1], v, places), etatVide());
}

const complement = (valeurs: readonly number[]): number[] =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => !valeurs.includes(v));

describe('triplet-cache', () => {
  test('1, 2 et 3 ne peuvent aller que dans trois cases', () => {
    const places = ['L1C1', 'L1C2', 'L1C5'];
    const etape = tripletCache.chercher(ctx9, cachees([1, 2, 3], places));
    assert.deepEqual(motif(etape), places);
    assert.deepEqual(eliminations(etape), partout(places, complement([1, 2, 3])));
    assert.equal(etape?.niveau, 'difficile');
  });

  test('rien si les trois chiffres occupent quatre cases', () => {
    let etat = cachees([1, 2], ['L1C1', 'L1C2', 'L1C5']);
    etat = retirerSauf(etat, [ligne1], 3, ['L1C1', 'L1C9']);
    assert.equal(tripletCache.chercher(ctx9, etat), null);
  });
});
