// Tests des fabriques de régions et de la compilation des définitions.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  cage,
  definitionClassique,
  regionsBlocs,
  regionsColonnes,
  regionsDiagonales,
  regionsIrregulieres,
  regionsLignes,
} from '../../src/moteur/regions.ts';
import { compiler } from '../../src/moteur/structure.ts';

describe('fabriques de régions', () => {
  test('lignes et colonnes 9x9', () => {
    const lignes = regionsLignes(9, 9);
    const colonnes = regionsColonnes(9, 9);
    assert.equal(lignes.length, 9);
    assert.equal(colonnes.length, 9);
    assert.deepEqual(lignes[1]?.cellules, [9, 10, 11, 12, 13, 14, 15, 16, 17]);
    assert.deepEqual(colonnes[2]?.cellules, [2, 11, 20, 29, 38, 47, 56, 65, 74]);
    assert.equal(lignes[0]?.forme, 'ligne');
  });

  test('blocs 3×3, 2×3 et 2×2', () => {
    const b9 = regionsBlocs(9, 3, 3);
    assert.equal(b9.length, 9);
    assert.deepEqual(b9[4]?.cellules, [30, 31, 32, 39, 40, 41, 48, 49, 50]);
    const b6 = regionsBlocs(6, 2, 3);
    assert.equal(b6.length, 6);
    assert.deepEqual(b6[0]?.cellules, [0, 1, 2, 6, 7, 8]);
    assert.deepEqual(b6[1]?.cellules, [3, 4, 5, 9, 10, 11]);
    assert.equal(regionsBlocs(4, 2, 2).length, 4);
    assert.throws(() => regionsBlocs(9, 2, 3));
  });

  test('diagonales', () => {
    const [d1, d2] = regionsDiagonales(4);
    assert.deepEqual(d1?.cellules, [0, 5, 10, 15]);
    assert.deepEqual(d2?.cellules, [3, 6, 9, 12]);
  });

  test('régions irrégulières depuis une carte', () => {
    const carte = [1, 1, 0, 0, 1, 1, 0, 0, 2, 2, 3, 3, 2, 2, 3, 3];
    const regions = regionsIrregulieres(carte);
    assert.equal(regions.length, 4);
    assert.deepEqual(regions[0]?.cellules, [2, 3, 6, 7]);
    assert.deepEqual(regions[1]?.cellules, [0, 1, 4, 5]);
    assert.ok(regions.every((r) => r.forme === 'irreguliere'));
  });

  test('cage : distinctes vrai par défaut', () => {
    assert.equal(cage([0, 1], 8).distinctes, true);
    assert.equal(cage([0, 1], 8, false).distinctes, false);
    assert.equal(cage([0, 1], 8).total, 8);
  });

  test('definitionClassique 9x9 : 27 régions de 9 cases', () => {
    const def = definitionClassique(9, 3, 3);
    assert.equal(def.regions.length, 27);
    assert.ok(def.regions.every((r) => r.cellules.length === 9));
    assert.deepEqual(def.valeurs, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('compiler', () => {
  test('chaque case 9x9 appartient à 3 régions', () => {
    const s = compiler(definitionClassique(9, 3, 3));
    assert.equal(s.nombreCellules, 81);
    assert.ok(s.regionsCellule.every((r) => r.length === 3));
    assert.equal(s.masqueValeurs, 0x1ff);
  });

  test('refuse les définitions incohérentes', () => {
    const base = definitionClassique(4, 2, 2);
    assert.throws(() => compiler({ ...base, regions: [...base.regions, cage([0, 16], 3)] }), /hors de la grille/);
    assert.throws(() => compiler({ ...base, valeurs: [1, 2, 2, 4] }), /double/);
    assert.throws(() => compiler({ ...base, valeurs: [0, 1, 2, 3] }), /hors/);
    // Deux cases distinctes parmi 1-4 : total entre 3 et 7
    assert.throws(() => compiler({ ...base, regions: [cage([0, 1], 2)] }), /impossible/);
    assert.throws(() => compiler({ ...base, regions: [cage([0, 1], 8)] }), /impossible/);
    // Sans l'unicité, 4+4 = 8 devient possible
    assert.doesNotThrow(() => compiler({ ...base, regions: [cage([0, 1], 8, false)] }));
  });
});
