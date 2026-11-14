import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { voisineCommune } from '../../../../src/moteur/logique/techniques/voisine-commune.ts';
import { cases, ctx9, ctxTectonic, eliminations, etatVide, motif, partout, retirer, retirerSauf } from '../aide.ts';

describe('voisine-commune', () => {
  test('Tectonic : le 3 de la zone n\'a que 2 places, les cases qui touchent les deux le perdent', () => {
    const etat = retirer(etatVide(ctxTectonic), ['L3C3'], 3, ctxTectonic);
    const etape = voisineCommune.chercher(ctxTectonic, etat);
    assert.deepEqual(motif(etape, ctxTectonic), ['L3C1', 'L3C2']);
    assert.deepEqual(eliminations(etape, ctxTectonic), { L2C1: [3], L2C2: [3] });
    assert.deepEqual(etape?.regions, [2]);
    assert.equal(etape?.niveau, 'facile');
    assert.equal(
      etape?.explication,
      'La zone de L3C1 : le 3 ne peut aller que dans L3C1 et L3C2. L2C1 et L2C2 touchent toutes ces cases : ' +
        'elles ne peuvent pas contenir le 3. On élimine le 3 de L2C1 et L2C2.',
    );
  });

  test('sudoku : équivaut au pointing (« voient »)', () => {
    const bloc1 = ['L1C1', 'L1C2', 'L1C3', 'L2C1', 'L2C2', 'L2C3', 'L3C1', 'L3C2', 'L3C3'];
    const etape = voisineCommune.chercher(ctx9, retirerSauf(etatVide(), [bloc1], 4, ['L1C1', 'L1C2']));
    assert.deepEqual(eliminations(etape), partout(cases('L1', 4, 9), [4]));
    assert.match(etape?.explication ?? '', /voient toutes ces cases/);
  });

  test('3 places ou plus : pas pour cette technique ; motif sans effet ignoré', () => {
    assert.equal(voisineCommune.chercher(ctxTectonic, etatVide(ctxTectonic)), null);
    const sansEffet = retirer(retirer(etatVide(ctxTectonic), ['L3C3'], 3, ctxTectonic), ['L2C1', 'L2C2'], 3, ctxTectonic);
    assert.equal(voisineCommune.chercher(ctxTectonic, sansEffet), null);
  });
});
