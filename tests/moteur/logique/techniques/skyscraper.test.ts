import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { skyscraper } from '../../../../src/moteur/logique/techniques/skyscraper.ts';
import { cases, ctx9, eliminations, etatVide, motif, partout, retirerSauf } from '../aide.ts';

/** Le 1 n'a que deux places dans la ligne 1 et dans la ligne 5. */
function deuxLignes(places1: string[], places5: string[]) {
  return retirerSauf(retirerSauf(etatVide(), [cases('L1', 1, 9)], 1, places1), [cases('L5', 1, 9)], 1, places5);
}

describe('skyscraper', () => {
  test('liens forts dans les lignes 1 et 5, reliés par la colonne 2', () => {
    const etape = skyscraper.chercher(ctx9, deuxLignes(['L1C2', 'L1C7'], ['L5C2', 'L5C8']));
    assert.deepEqual(motif(etape), ['L1C7', 'L1C2', 'L5C2', 'L5C8']);
    // Cases qui voient à la fois L1C7 et L5C8
    assert.deepEqual(eliminations(etape), partout(['L2C8', 'L3C8', 'L4C7', 'L6C7'], [1]));
    assert.equal(etape?.niveau, 'difficile');
    assert.match(etape?.explication ?? '', /L1C2 et L5C2 se voient \(la colonne 2\), donc L1C7 ou L5C8 contient le 1/);
  });

  test("rien quand les deux autres extrémités sont aussi alignées (c'est un X-Wing)", () => {
    assert.equal(skyscraper.chercher(ctx9, deuxLignes(['L1C2', 'L1C7'], ['L5C2', 'L5C7'])), null);
  });

  test('rien si les liens ne se rejoignent pas', () => {
    assert.equal(skyscraper.chercher(ctx9, deuxLignes(['L1C2', 'L1C7'], ['L5C3', 'L5C8'])), null);
  });
});
