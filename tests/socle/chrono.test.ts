// Tests du chronomètre : pauses manuelle et automatique indépendantes, fin de partie.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  changerVisibilite,
  creerChrono,
  estEnMarche,
  lireMs,
  mettreEnPause,
  reprendre,
  terminer,
} from '../../src/socle/chrono.ts';

describe('chronomètre', () => {
  test('tourne dès sa création, compte le temps écoulé', () => {
    const c = creerChrono(1000);
    assert.ok(estEnMarche(c));
    assert.equal(lireMs(c, 1000), 0);
    assert.equal(lireMs(c, 6000), 5000);
  });

  test('reprise d\'une partie sauvegardée : repart du temps enregistré', () => {
    const c = creerChrono(0, 42_000);
    assert.equal(lireMs(c, 1000), 43_000);
  });

  test('pause manuelle puis reprise', () => {
    let c = creerChrono(0);
    c = mettreEnPause(c, 3000);
    assert.equal(estEnMarche(c), false);
    assert.equal(lireMs(c, 10_000), 3000, 'figé pendant la pause');
    c = reprendre(c, 10_000);
    assert.equal(lireMs(c, 12_000), 5000);
  });

  test('pause automatique quand l\'appli passe en arrière-plan', () => {
    let c = creerChrono(0);
    c = changerVisibilite(c, 2000, false);
    assert.equal(lireMs(c, 60_000), 2000);
    c = changerVisibilite(c, 60_000, true);
    assert.equal(lireMs(c, 61_000), 3000);
  });

  test('revenir dans l\'appli ne relance pas un chrono mis en pause par le joueur', () => {
    let c = creerChrono(0);
    c = mettreEnPause(c, 1000);
    c = changerVisibilite(c, 2000, false);
    c = changerVisibilite(c, 5000, true);
    assert.equal(estEnMarche(c), false);
    assert.equal(lireMs(c, 9000), 1000);
    c = reprendre(c, 9000);
    assert.equal(lireMs(c, 10_000), 2000);
  });

  test('reprendre alors que l\'appli est masquée : le chrono attend qu\'elle redevienne visible', () => {
    let c = creerChrono(0);
    c = mettreEnPause(c, 1000);
    c = changerVisibilite(c, 1000, false);
    c = reprendre(c, 2000);
    assert.equal(estEnMarche(c), false);
    c = changerVisibilite(c, 5000, true);
    assert.equal(lireMs(c, 6000), 2000);
  });

  test('chrono créé appli masquée : ne tourne pas avant d\'être visible', () => {
    let c = creerChrono(0, 0, false);
    assert.equal(lireMs(c, 5000), 0);
    c = changerVisibilite(c, 5000, true);
    assert.equal(lireMs(c, 6000), 1000);
  });

  test('partie terminée : temps figé définitivement', () => {
    let c = creerChrono(0);
    c = terminer(c, 7000);
    c = reprendre(c, 8000);
    c = changerVisibilite(c, 9000, true);
    assert.equal(estEnMarche(c), false);
    assert.equal(lireMs(c, 100_000), 7000);
  });

  test('une horloge qui recule ne fait pas baisser le temps', () => {
    const c = creerChrono(5000, 1000);
    assert.equal(lireMs(c, 4000), 1000);
  });

  test('aucune mutation', () => {
    const c = Object.freeze(creerChrono(0));
    mettreEnPause(c, 10);
    changerVisibilite(c, 10, false);
    terminer(c, 10);
    assert.ok(estEnMarche(c));
  });
});
