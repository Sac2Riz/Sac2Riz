import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  bordures,
  casesAutour,
  casesCote,
  cellulesDesZones,
  estNumerotee,
  nomCase,
  numeroterZones,
  zonesConnexes,
} from '../../../src/games/tectonic/geometrie.ts';

describe('Tectonic : géométrie', () => {
  test('cases qui se touchent (côté ou diagonale) et cases côte à côte', () => {
    assert.deepEqual(casesAutour(3, 4, 0), [1, 4, 5]);
    assert.deepEqual(casesAutour(3, 4, 5), [0, 1, 2, 4, 6, 8, 9, 10]);
    assert.deepEqual(casesAutour(3, 4, 11), [6, 7, 10]);
    assert.deepEqual(casesCote(3, 4, 5), [1, 4, 6, 9]);
    assert.deepEqual(casesCote(3, 4, 3), [2, 7]);
    assert.equal(nomCase(4, 6), 'L2C3');
  });

  test('numérotation des zones dans l\'ordre de lecture', () => {
    assert.deepEqual(numeroterZones([7, 7, 3, 9, 3]), [0, 0, 1, 2, 1]);
    assert.ok(estNumerotee([0, 0, 1, 2, 1]));
    assert.ok(!estNumerotee([1, 1, 0]));
    assert.deepEqual(cellulesDesZones([0, 1, 0, 2]), [[0, 2], [1], [3]]);
  });

  test("zones d'un seul tenant (par les côtés)", () => {
    // 0 1
    // 1 0  : les deux zones ne se touchent qu'en diagonale
    assert.ok(!zonesConnexes(2, 2, [0, 1, 1, 0]));
    assert.ok(zonesConnexes(2, 2, [0, 0, 1, 1]));
    assert.ok(zonesConnexes(3, 4, [0, 0, 0, 1, 0, 0, 1, 1, 2, 2, 2, 1]));
  });

  test('bordures épaisses : bord de la grille ou zone voisine différente', () => {
    const b = bordures(2, 3, [0, 0, 1, 0, 1, 1]);
    assert.deepEqual(b[0], { haut: true, droite: false, bas: false, gauche: true });
    assert.deepEqual(b[1], { haut: true, droite: true, bas: true, gauche: false });
    assert.deepEqual(b[4], { haut: true, droite: false, bas: true, gauche: true });
    assert.deepEqual(b[5], { haut: false, droite: true, bas: true, gauche: false });
  });
});
