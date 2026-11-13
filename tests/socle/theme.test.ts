// Tests du choix de thème (partie pure : ordre du bouton « Thème » et noms affichés).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { NOMS_THEMES, ORDRE_THEMES, themeSuivant } from '../../src/socle/theme.ts';

describe('thème', () => {
  test('Automatique → Clair → Sombre → Automatique', () => {
    assert.equal(themeSuivant('systeme'), 'clair');
    assert.equal(themeSuivant('clair'), 'sombre');
    assert.equal(themeSuivant('sombre'), 'systeme');
  });

  test('chaque thème a un nom affiché et une place dans le cycle', () => {
    assert.deepEqual([...ORDRE_THEMES].sort(), Object.keys(NOMS_THEMES).sort());
    assert.equal(NOMS_THEMES.clair, 'Clair');
  });
});
