// Tests de la mise en forme des temps, des niveaux et de la force.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { formaterTemps, libelleForce, libelleNiveau, plageForce } from '../../src/socle/format.ts';

describe('formaterTemps', () => {
  test('minutes:secondes, puis heures au-delà d\'une heure', () => {
    assert.equal(formaterTemps(0), '0:00');
    assert.equal(formaterTemps(999), '0:00');
    assert.equal(formaterTemps(247_000), '4:07');
    assert.equal(formaterTemps(754_900), '12:34');
    assert.equal(formaterTemps(3_723_000), '1:02:03');
    assert.equal(formaterTemps(-5), '0:00');
  });
});

describe('niveaux et force', () => {
  test('chaque niveau avec sa plage de force', () => {
    assert.equal(libelleNiveau('debutant'), 'Débutant · Force 1-2');
    assert.equal(libelleNiveau('facile'), 'Facile · Force 3-4');
    assert.equal(libelleNiveau('moyen'), 'Moyen · Force 5-6');
    assert.equal(libelleNiveau('difficile'), 'Difficile · Force 7-8');
    assert.equal(libelleNiveau('expert'), 'Expert · Force 9');
    assert.equal(libelleNiveau('diabolique'), 'Diabolique · Force 10');
    assert.equal(plageForce('expert'), 'Force 9');
  });

  test("force exacte d'une grille", () => {
    assert.equal(libelleForce('moyen', 6), 'Moyen · Force 6');
    assert.equal(libelleForce('diabolique', 10), 'Diabolique · Force 10');
  });
});
