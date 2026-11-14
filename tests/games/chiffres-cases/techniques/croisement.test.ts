// Tests des techniques de croisement : « croisement » (Moyen, liste de 3 nombres au plus),
// « croisement étendu » (Difficile, 4 au plus) et « croisement complet » (Expert, sans limite).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { etatDepart } from '../../../../src/games/chiffres-cases/solveur/etat.ts';
import { croisementComplet } from '../../../../src/games/chiffres-cases/solveur/techniques/croisement-complet.ts';
import { CANDIDATS_MAX_CROISEMENT_ETENDU, croisementEtendu } from '../../../../src/games/chiffres-cases/solveur/techniques/croisement-etendu.ts';
import { CANDIDATS_MAX_CROISEMENT, croisement } from '../../../../src/games/chiffres-cases/solveur/techniques/croisement.ts';
import { etatAvec, H1, n, structureA, V1, V3 } from '../aide.ts';

describe('techniques de croisement', () => {
  test('seuils : 3 nombres (croisement) et 4 (croisement étendu)', () => {
    assert.equal(CANDIDATS_MAX_CROISEMENT, 3);
    assert.equal(CANDIDATS_MAX_CROISEMENT_ETENDU, 4);
  });

  test('croisement : un emplacement à 2 nombres impose son chiffre à l\'emplacement croisé', () => {
    const { p } = structureA();
    const etat = etatAvec(p, [['123', '146'], ['123', '146', '358', '678'], ['123', '146', '358', '678'], ['123', '146', '358', '678']]);
    const etape = croisement.chercher(p, etat);
    assert.ok(etape !== null);
    // En L1C1, l'horizontal (123 ou 146) impose 1 : 358 et 678 sont impossibles dans le vertical
    assert.deepEqual(etape.eliminations, [{ emplacement: V1, nombres: [n(p, '358'), n(p, '678')] }]);
    assert.deepEqual(etape.motif, [H1, V1]);
    assert.match(etape.explication, /Au croisement L1C1, l'horizontal en L1C1 ne peut recevoir que 123 ou 146 : le chiffre y est donc 1\./);
  });

  test('liste de 4 nombres : seulement le croisement étendu (et le complet)', () => {
    const { p } = structureA();
    const etat = etatDepart(p, []); // 4 candidats partout
    assert.equal(croisement.chercher(p, etat), null);
    const etape = croisementEtendu.chercher(p, etat);
    assert.ok(etape !== null);
    // En L1C3, l'horizontal L1 n'y permet que 3, 6 ou 8 : 123 et 146 sont impossibles dans le vertical L1C3
    assert.deepEqual(etape.eliminations, [{ emplacement: V3, nombres: [n(p, '123'), n(p, '146')] }]);
    assert.match(etape.explication, /les 4 nombres encore possibles dans l'horizontal en L1C1/);
    assert.deepEqual(croisementComplet.chercher(p, etat)?.eliminations, etape.eliminations);
  });

  test('aucun effet réel → aucune étape', () => {
    const { p } = structureA();
    const etat = etatAvec(p, [['123', '146'], ['123', '146'], ['358', '678'], ['358', '678']]);
    assert.equal(croisementComplet.chercher(p, etat), null);
  });
});
