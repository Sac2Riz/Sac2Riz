import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { etatPourIndice, indice } from '../../../src/games/tectonic/indice.ts';
import { logique } from '../../../src/games/tectonic/logique.ts';
import { RETRAIT_AUTO_NOTES } from '../../../src/games/tectonic/meta.ts';
import type { EtatTectonic } from '../../../src/games/tectonic/types.ts';
import { valeursDuMasque } from '../../../src/moteur/candidats.ts';
import { caseVide, DEBUTANT, grille } from './aide.ts';

const AVEC = { [RETRAIT_AUTO_NOTES.id]: true };
const SANS = { [RETRAIT_AUTO_NOTES.id]: false };

describe('Tectonic : indices', () => {
  const D = DEBUTANT;
  const depart = logique.etatInitial(D);

  test('un chiffre faux est signalé en premier', () => {
    const c = caseVide(D, 2);
    const faux = (D.solution[c] ?? 1) === 1 ? 2 : 1;
    const etat = logique.appliquer(depart, { type: 'placer', cellule: c, valeur: faux }, D);
    const i = indice(etat, D, AVEC);
    assert.equal(i?.titre, 'Chiffre faux');
    assert.deepEqual(i?.action, { type: 'effacer', cellule: c });
    assert.deepEqual(i?.marques.cellules, [c]);
  });

  test('placement : juste, avec le réglage de retrait des notes', () => {
    const i = indice(depart, D, AVEC);
    assert.ok(i !== null && i.action.type === 'placer');
    const { cellule, valeur } = i.action;
    assert.equal(valeur, D.solution[cellule]);
    assert.deepEqual(i.marques.placements, [{ cellule, valeur }]);
    assert.ok(i.explication.length > 0);
    assert.equal(indice(depart, D, SANS)?.action.type, 'placer-seul');
  });

  test('éliminations : notes fixées (candidats moins ceux retirés), jamais le bon chiffre', () => {
    // Grille Moyen : jouer les indices jusqu'au premier indice d'éliminations
    const d = grille('moyen', 1);
    let etat: EtatTectonic = logique.etatInitial(d);
    for (let coups = 0; coups < 200; coups++) {
      const i = indice(etat, d, AVEC);
      assert.ok(i !== null);
      if (i.action.type === 'definir-notes') {
        assert.ok(i.marques.eliminations.length > 0);
        assert.ok(i.marques.zones.length > 0 || i.marques.cellules.length > 0);
        const base = etatPourIndice(etat, d);
        for (const { cellule, notes } of i.action.changements) {
          assert.ok(notes.includes(d.solution[cellule] ?? 0), 'le bon chiffre reste');
          assert.ok(notes.every((v) => valeursDuMasque(base.candidats[cellule] ?? 0).includes(v)));
        }
        return;
      }
      etat = logique.appliquer(etat, i.action, d);
    }
    assert.fail("aucun indice d'éliminations rencontré");
  });

  test('grille finie : aucun indice', () => {
    assert.equal(indice({ valeurs: D.solution, notes: D.solution.map(() => []) }, D, AVEC), null);
  });
});
