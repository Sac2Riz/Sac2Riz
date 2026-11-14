// Tests de la technique « une seule place » (Facile).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { placeUnique } from '../../../../src/games/chiffres-cases/solveur/techniques/place-unique.ts';
import { etatAvec, H1, n, structureA } from '../aide.ts';

describe('technique : une seule place', () => {
  test('un nombre qui ne va que dans un emplacement y est placé', () => {
    const { p } = structureA();
    const etat = etatAvec(p, [['123', '146'], ['146', '358'], ['358', '678'], ['358', '678']]);
    const etape = placeUnique.chercher(p, etat);
    assert.ok(etape !== null);
    assert.deepEqual(etape.placements, [{ emplacement: H1, nombre: n(p, '123') }]);
    assert.match(etape.explication, /123 ne peut aller dans aucun autre emplacement de 3 cases que l'horizontal en L1C1/);
  });

  test('rien si chaque nombre a au moins deux places', () => {
    const { p } = structureA();
    const etat = etatAvec(p, [['123', '146'], ['123', '146'], ['358', '678'], ['358', '678']]);
    assert.equal(placeUnique.chercher(p, etat), null);
  });
});
