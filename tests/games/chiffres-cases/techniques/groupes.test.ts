// Tests des techniques « groupe d'emplacements » et « groupe de nombres » (Difficile).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { groupeCache } from '../../../../src/games/chiffres-cases/solveur/techniques/groupe-cache.ts';
import { groupeNu } from '../../../../src/games/chiffres-cases/solveur/techniques/groupe-nu.ts';
import { etatAvec, H1, H3, n, structureA, V1, V3 } from '../aide.ts';

describe('techniques de groupes', () => {
  test('groupe d\'emplacements : 2 emplacements, 2 nombres → retirés des autres', () => {
    const { p } = structureA();
    const etat = etatAvec(p, [['123', '146'], ['123', '146'], ['123', '146', '358', '678'], ['123', '358', '678']]);
    const etape = groupeNu.chercher(p, etat);
    assert.ok(etape !== null);
    assert.deepEqual(etape.motif, [H1, V1]);
    assert.deepEqual(etape.eliminations, [
      { emplacement: V3, nombres: [n(p, '123'), n(p, '146')] },
      { emplacement: H3, nombres: [n(p, '123')] },
    ]);
    assert.match(etape.explication, /horizontal en L1C1 et vertical en L1C1 ne peuvent recevoir que 123 et 146/);
  });

  test('groupe de nombres : 2 nombres, 2 emplacements → ces emplacements ne gardent qu\'eux', () => {
    const { p } = structureA();
    const etat = etatAvec(p, [['123', '146', '358'], ['123', '146', '678'], ['358', '678'], ['358', '678']]);
    const etape = groupeCache.chercher(p, etat);
    assert.ok(etape !== null);
    assert.deepEqual(etape.motif, [H1, V1]);
    assert.deepEqual(etape.eliminations, [
      { emplacement: H1, nombres: [n(p, '358')] },
      { emplacement: V1, nombres: [n(p, '678')] },
    ]);
  });

  test('rien quand le groupe couvre tous les emplacements de la longueur', () => {
    const { p } = structureA();
    const etat = etatAvec(p, [['123', '146'], ['123', '146'], ['358', '678'], ['358', '678']]);
    assert.equal(groupeNu.chercher(p, etat), null);
    assert.equal(groupeCache.chercher(p, etat), null);
  });
});
