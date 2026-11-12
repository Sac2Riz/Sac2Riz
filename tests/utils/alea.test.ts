// Tests du générateur pseudo-aléatoire à graine.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { creerAlea } from '../../src/utils/alea.ts';

describe('creerAlea', () => {
  test('la même graine donne la même suite', () => {
    const a = creerAlea(1234);
    const b = creerAlea(1234);
    for (let i = 0; i < 100; i++) assert.equal(a.suivant(), b.suivant());
  });

  test('deux graines différentes donnent des suites différentes', () => {
    const a = creerAlea(1);
    const b = creerAlea(2);
    const suiteA = Array.from({ length: 10 }, () => a.suivant());
    const suiteB = Array.from({ length: 10 }, () => b.suivant());
    assert.notDeepEqual(suiteA, suiteB);
  });

  test('suivant() reste dans [0, 1[ et entier() dans [0, max[', () => {
    const alea = creerAlea(42);
    for (let i = 0; i < 1000; i++) {
      const x = alea.suivant();
      assert.ok(x >= 0 && x < 1);
      const n = alea.entier(9);
      assert.ok(Number.isInteger(n) && n >= 0 && n < 9);
    }
  });

  test('melanger() renvoie une permutation sans modifier l\'original', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
    const melange = creerAlea(7).melanger(original);
    assert.deepEqual([...melange].sort((x, y) => x - y), [...original]);
    assert.deepEqual(original, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
