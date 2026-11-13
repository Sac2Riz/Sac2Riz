// Tests de l'historique annuler / rétablir.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  actionsAppliquees,
  annuler,
  estHistoriqueValide,
  etatCourant,
  historiqueVide,
  jouer,
  peutAnnuler,
  peutRetablir,
  retablir,
  type Historique,
} from '../../src/socle/historique.ts';

/** Jeu minimal : l'état est une liste, chaque action y ajoute un nombre. */
const appliquer = (etat: readonly number[], action: number): readonly number[] => [...etat, action];

function jouerTout(actions: number[]): Historique<number> {
  return actions.reduce(jouer, historiqueVide<number>());
}

describe('historique', () => {
  test('jouer, annuler, rétablir', () => {
    let h = jouerTout([1, 2, 3]);
    assert.deepEqual(etatCourant(h, [], appliquer), [1, 2, 3]);
    h = annuler(annuler(h));
    assert.equal(h.curseur, 1);
    assert.deepEqual(etatCourant(h, [], appliquer), [1]);
    assert.deepEqual(h.actions, [1, 2, 3], 'les actions annulées restent disponibles');
    h = retablir(h);
    assert.deepEqual(etatCourant(h, [], appliquer), [1, 2]);
  });

  test('jouer après une annulation efface les actions annulées', () => {
    const h = jouer(annuler(annuler(jouerTout([1, 2, 3]))), 9);
    assert.deepEqual(h, { actions: [1, 9], curseur: 2 });
    assert.equal(peutRetablir(h), false);
  });

  test('bornes : rien à annuler / rétablir → historique inchangé', () => {
    const vide = historiqueVide<number>();
    assert.equal(peutAnnuler(vide), false);
    assert.equal(annuler(vide), vide);
    const h = jouerTout([1]);
    assert.equal(retablir(h), h);
  });

  test('annuler / rétablir illimités', () => {
    const actions = Array.from({ length: 1000 }, (_, i) => i);
    let h = jouerTout(actions);
    while (peutAnnuler(h)) h = annuler(h);
    assert.deepEqual(etatCourant(h, [], appliquer), []);
    while (peutRetablir(h)) h = retablir(h);
    assert.deepEqual(etatCourant(h, [], appliquer), actions);
  });

  test('aucune mutation (historique et état initial gelés)', () => {
    const h = Object.freeze({ actions: Object.freeze([1, 2]), curseur: 2 });
    const initial = Object.freeze([0]);
    jouer(h, 3);
    annuler(h);
    assert.deepEqual(etatCourant(h, initial, appliquer), [0, 1, 2]);
    assert.deepEqual(actionsAppliquees(annuler(h)), [1]);
  });

  test('estHistoriqueValide', () => {
    assert.ok(estHistoriqueValide({ actions: [1, 2], curseur: 2 }));
    assert.equal(estHistoriqueValide({ actions: [1, 2], curseur: 3 }), false);
    assert.equal(estHistoriqueValide({ actions: [], curseur: -1 }), false);
    assert.equal(estHistoriqueValide({ actions: [1], curseur: 0.5 }), false);
  });
});
