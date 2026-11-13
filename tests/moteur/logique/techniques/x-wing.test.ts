import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { xWing } from '../../../../src/moteur/logique/techniques/x-wing.ts';
import type { EtatLogique } from '../../../../src/types/logique.ts';
import { cases, ctx9, eliminations, etatVide, motif, partout, retirer, retirerSauf } from '../aide.ts';

/** Dans les lignes la et lb, la valeur v ne peut aller que dans les colonnes ca et cb. */
function xWingLignes(etat: EtatLogique, v: number, la: number, lb: number, ca: number, cb: number): EtatLogique {
  const places = [`L${la}C${ca}`, `L${la}C${cb}`, `L${lb}C${ca}`, `L${lb}C${cb}`];
  return retirerSauf(etat, [cases(`L${la}`, 1, 9), cases(`L${lb}`, 1, 9)], v, places);
}

/** Cases des colonnes ca et cb hors des lignes la et lb. */
function reste(la: number, lb: number, ca: number, cb: number): string[] {
  return [...cases(`C${ca}`, 1, 9), ...cases(`C${cb}`, 1, 9)].filter(
    (nom) => !nom.startsWith(`L${la}C`) && !nom.startsWith(`L${lb}C`),
  );
}

describe('x-wing', () => {
  test('le 4 dans les lignes 2 et 7 ne peut aller que dans les colonnes 3 et 8', () => {
    const etape = xWing.chercher(ctx9, xWingLignes(etatVide(), 4, 2, 7, 3, 8));
    assert.deepEqual(motif(etape), ['L2C3', 'L2C8', 'L7C3', 'L7C8']);
    assert.deepEqual(eliminations(etape), partout(reste(2, 7, 3, 8), [4]));
    assert.deepEqual(etape?.regions, [1, 6, 11, 16]);
    assert.equal(etape?.niveau, 'expert');
    assert.match(etape?.explication ?? '', /^X-Wing sur le 4 : dans la ligne 2 et la ligne 7, le 4 ne peut aller que dans la colonne 3 et la colonne 8/);
  });

  test('motif sans effet (4 déjà absent du reste des colonnes) : ignoré', () => {
    const etat = retirer(xWingLignes(etatVide(), 4, 2, 7, 3, 8), reste(2, 7, 3, 8), 4);
    assert.equal(xWing.chercher(ctx9, etat), null);
  });

  test("un X-Wing sans effet est sauté et la recherche continue jusqu'au X-Wing utile", () => {
    let etat = retirer(xWingLignes(etatVide(), 4, 2, 7, 3, 8), reste(2, 7, 3, 8), 4);
    etat = xWingLignes(etat, 6, 1, 5, 2, 6);
    const etape = xWing.chercher(ctx9, etat);
    assert.deepEqual(motif(etape), ['L1C2', 'L1C6', 'L5C2', 'L5C6']);
    assert.deepEqual(eliminations(etape), partout(reste(1, 5, 2, 6), [6]));
  });

  test('rien si les places occupent trois colonnes', () => {
    const etat = retirerSauf(etatVide(), [cases('L2', 1, 9), cases('L7', 1, 9)], 4, ['L2C3', 'L2C8', 'L7C3', 'L7C9']);
    assert.equal(xWing.chercher(ctx9, etat), null);
  });
});
