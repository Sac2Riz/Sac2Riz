import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { skyscraper } from '../../../../src/moteur/logique/techniques/skyscraper.ts';
import { deuxStringKite } from '../../../../src/moteur/logique/techniques/2-string-kite.ts';
import { xChain } from '../../../../src/moteur/logique/techniques/x-chain.ts';
import { cases, ctx9, eliminations, etatVide, motif, partout, retirerSauf } from '../aide.ts';

// Le 7 n'a que deux places dans les lignes 1, 4 et 8 :
// L1C1 = L1C5 - L4C5 = L4C9 - L8C9 = L8C2  (« - » : même colonne)
const etat = retirerSauf(
  retirerSauf(retirerSauf(etatVide(), [cases('L1', 1, 9)], 7, ['L1C1', 'L1C5']), [cases('L4', 1, 9)], 7, ['L4C5', 'L4C9']),
  [cases('L8', 1, 9)],
  7,
  ['L8C9', 'L8C2'],
);

describe('x-chain', () => {
  test('chaîne de 5 liens : L1C1 ou L8C2 contient le 7', () => {
    const etape = xChain.chercher(ctx9, etat);
    assert.deepEqual(motif(etape), ['L1C1', 'L1C5', 'L4C5', 'L4C9', 'L8C9', 'L8C2']);
    assert.deepEqual(eliminations(etape), partout(['L2C2', 'L3C2', 'L7C1', 'L9C1'], [7]));
    assert.equal(etape?.niveau, 'diabolique');
    assert.match(etape?.explication ?? '', /^Chaîne X sur le 7 : L1C1 = L1C5 - L4C5 = L4C9 - L8C9 = L8C2/);
    // Les motifs plus simples à deux liens forts ne s'appliquent pas
    assert.equal(skyscraper.chercher(ctx9, etat), null);
    assert.equal(deuxStringKite.chercher(ctx9, etat), null);
  });

  test("rien si la chaîne est coupée", () => {
    const coupe = retirerSauf(etat, [cases('L4', 1, 9)], 7, ['L4C6', 'L4C9']);
    assert.equal(xChain.chercher(ctx9, coupe), null);
    assert.equal(xChain.chercher(ctx9, etatVide()), null);
  });
});
