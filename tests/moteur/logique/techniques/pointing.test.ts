import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { pointing } from '../../../../src/moteur/logique/techniques/pointing.ts';
import { cases, ctx9, ctxDiagonal, eliminations, etatVide, motif, partout, retirer, retirerSauf } from '../aide.ts';

const bloc1 = ['L1C1', 'L1C2', 'L1C3', 'L2C1', 'L2C2', 'L2C3', 'L3C1', 'L3C2', 'L3C3'];

describe('pointing', () => {
  test('dans le bloc 1, le 4 ne peut aller que sur la ligne 1 : on le retire du reste de la ligne', () => {
    const etape = pointing.chercher(ctx9, retirerSauf(etatVide(), [bloc1], 4, ['L1C1', 'L1C2']));
    assert.deepEqual(motif(etape), ['L1C1', 'L1C2']);
    assert.deepEqual(eliminations(etape), partout(cases('L1', 4, 9), [4]));
    assert.deepEqual(etape?.regions, [18, 0]);
    assert.equal(etape?.niveau, 'moyen');
    assert.match(etape?.explication ?? '', /^Le bloc 1 : le 4 ne peut aller que dans L1C1 et L1C2, qui sont aussi dans la ligne 1/);
  });

  test('avec une diagonale (sudoku diagonal)', () => {
    const etat = retirerSauf(etatVide(ctxDiagonal), [bloc1], 6, ['L1C1', 'L2C2'], ctxDiagonal);
    const etape = pointing.chercher(ctxDiagonal, etat);
    assert.deepEqual(eliminations(etape, ctxDiagonal), partout(['L4C4', 'L5C5', 'L6C6', 'L7C7', 'L8C8', 'L9C9'], [6]));
    assert.match(etape?.explication ?? '', /la diagonale ↘/);
  });

  test('motif sans effet ignoré, et rien si le chiffre n\'est pas aligné', () => {
    const aligne = retirerSauf(etatVide(), [bloc1], 4, ['L1C1', 'L1C2']);
    assert.equal(pointing.chercher(ctx9, retirer(aligne, cases('L1', 4, 9), 4)), null);
    assert.equal(pointing.chercher(ctx9, retirerSauf(etatVide(), [bloc1], 4, ['L1C1', 'L2C2'])), null);
  });
});
