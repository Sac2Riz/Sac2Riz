import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { claiming } from '../../../../src/moteur/logique/techniques/claiming.ts';
import { cases, ctx9, eliminations, etatVide, motif, partout, retirerSauf } from '../aide.ts';

describe('claiming', () => {
  test('dans la ligne 1, le 4 ne peut aller que dans le bloc 1 : on le retire du reste du bloc', () => {
    const etape = claiming.chercher(ctx9, retirerSauf(etatVide(), [cases('L1', 1, 9)], 4, ['L1C1', 'L1C3']));
    assert.deepEqual(motif(etape), ['L1C1', 'L1C3']);
    assert.deepEqual(eliminations(etape), partout(['L2C1', 'L2C2', 'L2C3', 'L3C1', 'L3C2', 'L3C3'], [4]));
    assert.deepEqual(etape?.regions, [0, 18]);
    assert.equal(etape?.niveau, 'moyen');
  });

  test('dans une colonne aussi', () => {
    const etape = claiming.chercher(ctx9, retirerSauf(etatVide(), [cases('C9', 1, 9)], 2, ['L8C9', 'L9C9']));
    assert.deepEqual(eliminations(etape), partout(['L7C7', 'L7C8', 'L8C7', 'L8C8', 'L9C7', 'L9C8'], [2]));
  });

  test('rien si les places du chiffre sont dans deux blocs', () => {
    assert.equal(claiming.chercher(ctx9, retirerSauf(etatVide(), [cases('L1', 1, 9)], 4, ['L1C1', 'L1C4'])), null);
  });
});
