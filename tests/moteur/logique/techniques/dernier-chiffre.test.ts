import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { etatInitial } from '../../../../src/moteur/logique/etat.ts';
import { dernierChiffre } from '../../../../src/moteur/logique/techniques/dernier-chiffre.ts';
import { ctx9, etatVide, placements } from '../aide.ts';

describe('dernier-chiffre', () => {
  test('une ligne avec une seule case vide reçoit le chiffre manquant', () => {
    const valeurs = new Array<number>(81).fill(0);
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((v, i) => (valeurs[i] = v));
    const etape = dernierChiffre.chercher(ctx9, etatInitial(ctx9, valeurs));
    assert.deepEqual(placements(etape), { L1C9: 9 });
    assert.equal(etape?.technique, 'dernier-chiffre');
    assert.equal(etape?.niveau, 'debutant');
    assert.deepEqual(etape?.regions, [0]);
    assert.equal(etape?.explication, "La ligne 1 n'a plus qu'une case vide, L1C9 : il n'y manque que le 9. On place le 9 en L1C9.");
  });

  test('fonctionne aussi pour un bloc', () => {
    const valeurs = new Array<number>(81).fill(0);
    // Bloc 1 rempli sauf L3C3
    [0, 1, 2, 9, 10, 11, 18, 19].forEach((cellule, i) => (valeurs[cellule] = i + 1));
    assert.deepEqual(placements(dernierChiffre.chercher(ctx9, etatInitial(ctx9, valeurs))), { L3C3: 9 });
  });

  test('rien si chaque région a au moins deux cases vides', () => {
    const valeurs = new Array<number>(81).fill(0);
    [1, 2, 3, 4, 5, 6, 7].forEach((v, i) => (valeurs[i] = v));
    assert.equal(dernierChiffre.chercher(ctx9, etatInitial(ctx9, valeurs)), null);
    assert.equal(dernierChiffre.chercher(ctx9, etatVide()), null);
  });
});
