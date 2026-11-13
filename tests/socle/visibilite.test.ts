// Tests de la surveillance de visibilité, avec un document factice (EventTarget de Node),
// branchée sur le chronomètre comme elle le sera à l'étape 3b.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { changerVisibilite, creerChrono, lireMs, type Chrono } from '../../src/socle/chrono.ts';
import { estVisible, surveillerVisibilite } from '../../src/socle/visibilite.ts';

/** Document factice : on change visibilityState puis on émet l'événement, comme le navigateur. */
class DocumentFactice extends EventTarget {
  visibilityState = 'visible';
  basculer(etat: 'visible' | 'hidden'): void {
    this.visibilityState = etat;
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

describe('surveillance de la visibilité', () => {
  test('signale chaque passage arrière-plan / premier plan ; arrêt de la surveillance', () => {
    const doc = new DocumentFactice();
    const recus: boolean[] = [];
    const arreter = surveillerVisibilite(doc, (visible) => recus.push(visible));
    doc.basculer('hidden');
    doc.basculer('visible');
    arreter();
    doc.basculer('hidden');
    assert.deepEqual(recus, [false, true]);
    assert.equal(estVisible(doc), false);
  });

  test('branchée sur le chrono : pause automatique en arrière-plan', () => {
    const doc = new DocumentFactice();
    let heure = 0;
    let chrono: Chrono = creerChrono(heure);
    const arreter = surveillerVisibilite(doc, (visible) => {
      chrono = changerVisibilite(chrono, heure, visible);
    });
    heure = 10_000;
    doc.basculer('hidden');
    heure = 300_000; // 5 min sur une autre appli
    doc.basculer('visible');
    heure = 305_000;
    assert.equal(lireMs(chrono, heure), 15_000);
    arreter();
  });
});
