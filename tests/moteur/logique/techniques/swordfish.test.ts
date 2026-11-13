import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { swordfish } from '../../../../src/moteur/logique/techniques/swordfish.ts';
import { xWing } from '../../../../src/moteur/logique/techniques/x-wing.ts';
import { cases, ctx9, eliminations, etatVide, motif, partout, retirerSauf } from '../aide.ts';

// Le 5 : ligne 1 → colonnes 1 et 4 ; ligne 4 → colonnes 4 et 7 ; ligne 8 → colonnes 1 et 7
const places = ['L1C1', 'L1C4', 'L4C4', 'L4C7', 'L8C1', 'L8C7'];
const etat = retirerSauf(etatVide(), [cases('L1', 1, 9), cases('L4', 1, 9), cases('L8', 1, 9)], 5, places);

describe('swordfish', () => {
  test('trois lignes dont le 5 ne peut aller que dans trois colonnes', () => {
    const etape = swordfish.chercher(ctx9, etat);
    assert.deepEqual(motif(etape), places);
    const attendues = [...cases('C1', 1, 9), ...cases('C4', 1, 9), ...cases('C7', 1, 9)].filter(
      (nom) => !/^L[148]C/.test(nom),
    );
    assert.deepEqual(eliminations(etape), partout(attendues, [5]));
    assert.equal(etape?.niveau, 'expert');
    // Ce motif n'est pas un X-Wing
    assert.equal(xWing.chercher(ctx9, etat), null);
  });

  test('motif sans effet ignoré, et rien sur un état sans motif', () => {
    const vide = retirerSauf(etat, [cases('C1', 1, 9), cases('C4', 1, 9), cases('C7', 1, 9)], 5, places);
    assert.equal(swordfish.chercher(ctx9, vide), null);
    assert.equal(swordfish.chercher(ctx9, etatVide()), null);
  });
});
