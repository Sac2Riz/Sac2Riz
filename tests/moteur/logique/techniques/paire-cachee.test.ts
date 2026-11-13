import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { paireCachee } from '../../../../src/moteur/logique/techniques/paire-cachee.ts';
import type { EtatLogique } from '../../../../src/types/logique.ts';
import { cases, ctx9, eliminations, etatVide, motif, partout, retirerSauf } from '../aide.ts';

const ligne1 = cases('L1', 1, 9);

/** Dans la ligne 1, chacune des valeurs ne peut aller que dans les cases données. */
function cachees(valeurs: readonly number[], places: readonly string[]): EtatLogique {
  return valeurs.reduce((etat, v) => retirerSauf(etat, [ligne1], v, places), etatVide());
}

const complement = (valeurs: readonly number[]): number[] =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => !valeurs.includes(v));

describe('paire-cachee', () => {
  test('3 et 8 ne peuvent aller que dans L1C2 et L1C7 : ces cases ne gardent que 3 et 8', () => {
    const etape = paireCachee.chercher(ctx9, cachees([3, 8], ['L1C2', 'L1C7']));
    assert.deepEqual(motif(etape), ['L1C2', 'L1C7']);
    assert.deepEqual(eliminations(etape), partout(['L1C2', 'L1C7'], complement([3, 8])));
    assert.equal(etape?.niveau, 'moyen');
    assert.match(etape?.explication ?? '', /^Dans la ligne 1, les chiffres \{3, 8\} ne peuvent aller que dans L1C2 et L1C7/);
  });

  test('rien si un des deux chiffres a une troisième place', () => {
    const etat = retirerSauf(retirerSauf(etatVide(), [ligne1], 3, ['L1C2', 'L1C7']), [ligne1], 8, ['L1C2', 'L1C7', 'L1C9']);
    assert.equal(paireCachee.chercher(ctx9, etat), null);
  });
});
