import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { quadrupletCache } from '../../../../src/moteur/logique/techniques/quadruplet-cache.ts';
import type { EtatLogique } from '../../../../src/types/logique.ts';
import { cases, ctx9, eliminations, etatVide, motif, partout, retirerSauf } from '../aide.ts';

const ligne1 = cases('L1', 1, 9);

/** Dans la ligne 1, chacune des valeurs ne peut aller que dans les cases données. */
function cachees(valeurs: readonly number[], places: readonly string[]): EtatLogique {
  return valeurs.reduce((etat, v) => retirerSauf(etat, [ligne1], v, places), etatVide());
}

const complement = (valeurs: readonly number[]): number[] =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => !valeurs.includes(v));

describe('quadruplet-cache', () => {
  test('1, 2, 3 et 4 ne peuvent aller que dans quatre cases', () => {
    const places = ['L1C1', 'L1C2', 'L1C5', 'L1C8'];
    const etape = quadrupletCache.chercher(ctx9, cachees([1, 2, 3, 4], places));
    assert.deepEqual(motif(etape), places);
    assert.deepEqual(eliminations(etape), partout(places, complement([1, 2, 3, 4])));
  });

  test('rien si les quatre chiffres occupent cinq cases', () => {
    let etat = cachees([1, 2, 3], ['L1C1', 'L1C2', 'L1C5', 'L1C8']);
    etat = retirerSauf(etat, [ligne1], 4, ['L1C1', 'L1C9']);
    assert.equal(quadrupletCache.chercher(ctx9, etat), null);
  });
});
