import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { singletonCacheZone } from '../../../../src/moteur/logique/techniques/singleton-cache-zone.ts';
import { cases, ctx9, ctxTectonic, etatVide, placements, retirer, retirerSauf } from '../aide.ts';

describe('singleton-cache-zone', () => {
  test('dans une zone, le 3 ne peut aller qu\'en L3C2', () => {
    const etat = retirer(etatVide(ctxTectonic), ['L3C1', 'L3C3'], 3, ctxTectonic);
    const etape = singletonCacheZone.chercher(ctxTectonic, etat);
    assert.deepEqual(placements(etape, ctxTectonic), { L3C2: 3 });
    assert.equal(etape?.niveau, 'debutant');
    assert.match(etape?.explication ?? '', /^La zone de L3C1 : le 3 ne peut aller qu'en L3C2/);
  });

  test('ne cherche que dans les zones (rien au sudoku)', () => {
    assert.equal(singletonCacheZone.chercher(ctx9, retirerSauf(etatVide(), [cases('L1', 1, 9)], 7, ['L1C5'])), null);
    assert.equal(singletonCacheZone.chercher(ctxTectonic, etatVide(ctxTectonic)), null);
  });
});
