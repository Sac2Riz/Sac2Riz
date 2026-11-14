// Tests de la validation des grilles.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cage, definitionClassique, valeursUnA } from '../../src/moteur/regions.ts';
import { conflits, estComplete, estSolution } from '../../src/moteur/validation.ts';
import type { DefinitionGrille } from '../../src/types/grille.ts';
import { ENONCE_UNIQUE, SOLUTION_UNIQUE } from './grilles-connues.ts';

const def9 = definitionClassique(9, 3, 3);

function cageDeHuit(distinctes: boolean): DefinitionGrille {
  return { lignes: 1, colonnes: 2, valeurs: valeursUnA(9), regions: [cage([0, 1], 8, distinctes)], domaines: null };
}

describe('validation', () => {
  test('une solution correcte est valide et complète', () => {
    assert.deepEqual(conflits(def9, SOLUTION_UNIQUE), []);
    assert.ok(estSolution(def9, SOLUTION_UNIQUE));
    assert.ok(!estComplete(def9, ENONCE_UNIQUE));
    assert.ok(!estSolution(def9, ENONCE_UNIQUE));
    assert.deepEqual(conflits(def9, ENONCE_UNIQUE), []);
  });

  test('doublon dans une ligne', () => {
    const grille = [...ENONCE_UNIQUE];
    grille[2] = 5; // un deuxième 5 sur la première ligne
    assert.deepEqual(conflits(def9, grille), [0, 2]);
  });

  test('valeur non autorisée', () => {
    const grille = [...ENONCE_UNIQUE];
    grille[2] = 12;
    assert.deepEqual(conflits(def9, grille), [2]);
  });

  test('cage de 8 sur deux cases : 4+4 refusé si distinctes, accepté sinon', () => {
    assert.deepEqual(conflits(cageDeHuit(true), [4, 4]), [0, 1]);
    assert.ok(!estSolution(cageDeHuit(true), [4, 4]));
    assert.deepEqual(conflits(cageDeHuit(false), [4, 4]), []);
    assert.ok(estSolution(cageDeHuit(true), [3, 5]));
  });

  test('cage : somme dépassée ou cage pleine fausse', () => {
    assert.deepEqual(conflits(cageDeHuit(true), [9, 0]), [0]);
    assert.deepEqual(conflits(cageDeHuit(true), [2, 0]), []);
    assert.deepEqual(conflits(cageDeHuit(true), [2, 5]), [0, 1]);
  });

  test('taille incorrecte', () => {
    assert.throws(() => conflits(def9, [1, 2, 3]));
  });
});
