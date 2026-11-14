// Tests des réglages propres à un jeu (code pur) : valeurs par défaut, complétion, préparation.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { ReglageJeu } from '../../src/types/jeu.ts';
import { estActif, preparationDemandee, valeursCompletes } from '../../src/utils/reglages-jeu.ts';

const AIDE: ReglageJeu = { id: 'aide', type: 'interrupteur', libelle: 'Aide', detail: '…', defaut: true, preparation: false };
const DEPART: ReglageJeu = { id: 'depart', type: 'interrupteur', libelle: 'Départ', detail: '…', defaut: false, preparation: true };

describe('réglages propres à un jeu', () => {
  test('estActif : valeur enregistrée, sinon valeur par défaut', () => {
    assert.equal(estActif({}, AIDE), true);
    assert.equal(estActif({ aide: false }, AIDE), false);
    assert.equal(estActif({}, DEPART), false);
  });

  test('valeursCompletes : tous les réglages déclarés, et seulement eux', () => {
    assert.deepEqual(valeursCompletes([AIDE, DEPART], undefined), { aide: true, depart: false });
    assert.deepEqual(valeursCompletes([AIDE, DEPART], { depart: true, ancien: true }), { aide: true, depart: true });
    assert.deepEqual(valeursCompletes([], { aide: false }), {});
  });

  test('preparationDemandee : seulement si un réglage « preparation » est activé', () => {
    assert.equal(preparationDemandee([AIDE, DEPART], {}), false);
    assert.equal(preparationDemandee([AIDE, DEPART], { depart: true }), true);
    assert.equal(preparationDemandee([AIDE], { aide: true }), false, 'réglage sans effet sur la grille');
    assert.equal(preparationDemandee([{ ...DEPART, defaut: true }], {}), true, 'activé par défaut');
  });
});
