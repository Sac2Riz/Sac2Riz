import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { paireNueEtendue } from '../../../../src/moteur/logique/techniques/paire-nue-etendue.ts';
import { ctxTectonic, eliminations, etatVide, fixer, motif } from '../aide.ts';

describe('paire-nue-etendue', () => {
  test('deux cases de la même zone {1, 2} : les cases qui voient les deux perdent 1 et 2', () => {
    const etat = fixer(etatVide(ctxTectonic), { L3C1: [1, 2], L3C3: [1, 2] }, ctxTectonic);
    const etape = paireNueEtendue.chercher(ctxTectonic, etat);
    assert.deepEqual(motif(etape, ctxTectonic), ['L3C1', 'L3C3']);
    // L2C2 touche les deux (hors zone) ; L3C2 est dans leur zone
    assert.deepEqual(eliminations(etape, ctxTectonic), { L2C2: [1, 2], L3C2: [1, 2] });
    assert.equal(etape?.niveau, 'moyen');
    assert.match(etape?.explication ?? '', /^L3C1 et L3C3 sont dans la même zone et n'ont que les candidats \{1, 2\}/);
  });

  test('deux cases qui se touchent, de zones différentes', () => {
    const etat = fixer(etatVide(ctxTectonic), { L1C3: [1, 2], L1C4: [1, 2] }, ctxTectonic);
    const etape = paireNueEtendue.chercher(ctxTectonic, etat);
    assert.match(etape?.explication ?? '', /se touchent/);
    assert.deepEqual(eliminations(etape, ctxTectonic), { L2C3: [1, 2], L2C4: [1, 2] });
  });

  test('rien si les deux cases ne se voient pas, ou si les candidats diffèrent', () => {
    assert.equal(paireNueEtendue.chercher(ctxTectonic, fixer(etatVide(ctxTectonic), { L1C1: [1, 2], L3C3: [1, 2] }, ctxTectonic)), null);
    assert.equal(paireNueEtendue.chercher(ctxTectonic, fixer(etatVide(ctxTectonic), { L3C1: [1, 2], L3C3: [1, 3] }, ctxTectonic)), null);
  });
});
