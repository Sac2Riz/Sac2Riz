import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { voisineCommuneEtendue } from '../../../../src/moteur/logique/techniques/voisine-commune-etendue.ts';
import { ctxTectonic, eliminations, etatVide, motif, retirer } from '../aide.ts';

describe('voisine-commune-etendue', () => {
  test('le 4 de la zone n\'a que 3 places ; L1C3 touche les trois', () => {
    const etat = retirer(etatVide(ctxTectonic), ['L3C4'], 4, ctxTectonic);
    const etape = voisineCommuneEtendue.chercher(ctxTectonic, etat);
    assert.deepEqual(motif(etape, ctxTectonic), ['L1C4', 'L2C3', 'L2C4']);
    assert.deepEqual(eliminations(etape, ctxTectonic), { L1C3: [4] });
    assert.equal(etape?.niveau, 'moyen');
    assert.match(etape?.explication ?? '', /L1C3 touche toutes ces cases : elle ne peut pas contenir le 4/);
  });

  test('2 places : laissé à la voisine commune (seuls les motifs de 3 places ou plus sont retenus)', () => {
    // Le 3 de la zone de L3C1 n'a que 2 places : ignoré ; le 1 en a 3, toutes touchées par L2C2
    const etat = retirer(etatVide(ctxTectonic), ['L3C3'], 3, ctxTectonic);
    const etape = voisineCommuneEtendue.chercher(ctxTectonic, etat);
    assert.deepEqual(motif(etape, ctxTectonic), ['L3C1', 'L3C2', 'L3C3']);
    assert.deepEqual(eliminations(etape, ctxTectonic), { L2C2: [1] });
  });
});
