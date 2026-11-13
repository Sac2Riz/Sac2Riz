// Tests des opérations sur les masques de bits.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  compterBits,
  contient,
  masqueComplet,
  masqueDe,
  plusPetiteValeur,
  valeursDuMasque,
} from '../../src/moteur/candidats.ts';

describe('candidats (masques de bits)', () => {
  test('masqueDe place le bit v-1', () => {
    assert.equal(masqueDe(1), 0b1);
    assert.equal(masqueDe(3), 0b100);
    assert.equal(masqueDe(9), 0b100000000);
  });

  test('masqueComplet et contient', () => {
    const m = masqueComplet([1, 3]);
    assert.equal(m, 0b101);
    assert.ok(contient(m, 1));
    assert.ok(!contient(m, 2));
    assert.ok(contient(m, 3));
    assert.equal(masqueComplet([1, 2, 3, 4, 5, 6, 7, 8, 9]), 0x1ff);
  });

  test('compterBits', () => {
    assert.equal(compterBits(0), 0);
    assert.equal(compterBits(0b101), 2);
    assert.equal(compterBits(0x1ff), 9);
    assert.equal(compterBits(masqueDe(31)), 1);
    assert.equal(compterBits(0x7fffffff), 31);
  });

  test('plusPetiteValeur et valeursDuMasque', () => {
    assert.equal(plusPetiteValeur(0), 0);
    assert.equal(plusPetiteValeur(0b10100), 3);
    assert.deepEqual(valeursDuMasque(0), []);
    assert.deepEqual(valeursDuMasque(0b100010101), [1, 3, 5, 9]);
    assert.deepEqual(valeursDuMasque(masqueDe(31)), [31]);
  });
});
