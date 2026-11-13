// Tests du choix de thème (partie pure : liste des choix et noms affichés).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { NOMS_THEMES, ORDRE_THEMES } from '../../src/socle/theme.ts';

describe('thème', () => {
  test('Automatique, Clair, Sombre, dans cet ordre', () => {
    assert.deepEqual(ORDRE_THEMES, ['systeme', 'clair', 'sombre']);
  });

  test('chaque thème a un nom affiché', () => {
    assert.deepEqual([...ORDRE_THEMES].sort(), Object.keys(NOMS_THEMES).sort());
    assert.equal(NOMS_THEMES.systeme, 'Automatique');
  });
});
