// Tests des outils affichés de l'écran de partie (VueJeu.outilsMasques).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { OUTILS, outilsAffiches } from '../../src/socle/outils.ts';
import { REGISTRE } from '../../src/games/registre.ts';
import { OUTILS_MASQUABLES } from '../../src/types/vue.ts';

describe('outils de l\'écran de partie', () => {
  test('aucun outil masqué : les cinq, dans l\'ordre', () => {
    assert.deepEqual(outilsAffiches([]), ['notes', 'effacer', 'annuler', 'retablir', 'indice']);
  });

  test('les outils masqués disparaissent, l\'ordre des autres est conservé', () => {
    assert.deepEqual(outilsAffiches(['notes']), ['effacer', 'annuler', 'retablir', 'indice']);
    assert.deepEqual(outilsAffiches(['indice', 'notes']), ['effacer', 'annuler', 'retablir']);
  });

  test('Annuler et Rétablir ne sont pas masquables ; tout outil masquable existe', () => {
    const masquables: readonly string[] = OUTILS_MASQUABLES;
    assert.ok(!masquables.includes('annuler') && !masquables.includes('retablir'));
    for (const o of OUTILS_MASQUABLES) assert.ok(OUTILS.includes(o));
  });

  test('sudoku : tous les outils ; chiffres casés : sans « Notes », pavé personnalisé', async () => {
    const vues = new Map(
      await Promise.all(REGISTRE.map(async (e) => [e.id, await (await e.charger()).jeu.chargerVue()] as const)),
    );
    assert.deepEqual(vues.get('sudoku-classique')?.outilsMasques, []);
    assert.equal(vues.get('sudoku-classique')?.pave.type, 'commun');
    assert.deepEqual(vues.get('chiffres-cases')?.outilsMasques, ['notes']);
    assert.equal(vues.get('chiffres-cases')?.pave.type, 'personnalise');
  });
});
