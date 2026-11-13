// Tests de la mise en forme des temps et des étoiles.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { etoiles, formaterTemps } from '../../src/socle/format.ts';

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

describe('etoiles', () => {
  test('une étoile par cran de difficulté', () => {
    assert.equal(etoiles('debutant'), '★');
    assert.equal(etoiles('moyen'), '★★★');
    assert.equal(etoiles('diabolique'), '★★★★★');
  });
});
