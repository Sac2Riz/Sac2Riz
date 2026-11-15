// Tests de l'état des touches du pavé commun (épuisées, impossibles, pause).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { etatsTouches, saisieAdmise } from '../../src/socle/pave.ts';

const VALEURS = ['1', '2', '3', '4', '5'];

describe('pavé commun : état des touches', () => {
  test('sans restriction ni décompte : toutes actives, libellé = valeur', () => {
    const etats = etatsTouches({ valeurs: VALEURS, restants: null, possibles: null, bloque: false });
    assert.deepEqual(
      etats.map((t) => [t.valeur, t.epuisee, t.impossible, t.desactivee, t.libelle]),
      VALEURS.map((v) => [v, false, false, false, v]),
    );
  });

  test('valeur épuisée : estompée mais toujours active', () => {
    const [un, deux] = etatsTouches({ valeurs: ['1', '2'], restants: { '1': 0, '2': 3 }, possibles: null, bloque: false });
    assert.deepEqual(un, { valeur: '1', epuisee: true, impossible: false, desactivee: false, libelle: '1, déjà posé partout' });
    assert.equal(deux?.epuisee, false);
  });

  test('valeur absente de restants : comptée comme épuisée (comme avant)', () => {
    const [un] = etatsTouches({ valeurs: ['1'], restants: {}, possibles: null, bloque: false });
    assert.equal(un?.epuisee, true);
  });

  test('valeurs hors de la case sélectionnée : impossibles et désactivées', () => {
    const etats = etatsTouches({ valeurs: VALEURS, restants: null, possibles: ['1', '2', '3'], bloque: false });
    assert.deepEqual(etats.map((t) => t.impossible), [false, false, false, true, true]);
    assert.deepEqual(etats.map((t) => t.desactivee), [false, false, false, true, true]);
    assert.equal(etats[3]?.libelle, '4, impossible dans cette case');
  });

  test('aucune valeur possible (case donnée) : tout le pavé grisé', () => {
    const etats = etatsTouches({ valeurs: VALEURS, restants: null, possibles: [], bloque: false });
    assert.ok(etats.every((t) => t.impossible && t.desactivee));
  });

  test('impossible prime sur épuisée pour le libellé ; les deux états restent connus', () => {
    const [un] = etatsTouches({ valeurs: ['1'], restants: { '1': 0 }, possibles: [], bloque: false });
    assert.equal(un?.epuisee, true);
    assert.equal(un?.impossible, true);
    assert.equal(un?.libelle, '1, impossible dans cette case');
  });

  test('pause ou partie terminée : tout désactivé, sans marquer les touches impossibles', () => {
    const etats = etatsTouches({ valeurs: VALEURS, restants: null, possibles: null, bloque: true });
    assert.ok(etats.every((t) => t.desactivee && !t.impossible));
  });

  test("ordre des touches = ordre des valeurs du pavé, même si possibles est dans le désordre", () => {
    const etats = etatsTouches({ valeurs: VALEURS, restants: null, possibles: ['3', '1'], bloque: false });
    assert.deepEqual(etats.map((t) => t.valeur), VALEURS);
    assert.deepEqual(etats.map((t) => t.impossible), [false, true, false, true, true]);
  });
});

describe('pavé commun : saisie admise', () => {
  test('valeur du pavé, sans restriction : admise', () => {
    assert.equal(saisieAdmise('4', VALEURS, null), true);
  });
  test('valeur hors du pavé : refusée', () => {
    assert.equal(saisieAdmise('7', VALEURS, null), false);
  });
  test('valeur impossible dans la case : refusée (clavier physique compris)', () => {
    assert.equal(saisieAdmise('4', VALEURS, ['1', '2', '3']), false);
    assert.equal(saisieAdmise('2', VALEURS, ['1', '2', '3']), true);
    assert.equal(saisieAdmise('1', VALEURS, []), false);
  });
});
