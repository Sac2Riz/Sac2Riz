// Tests du module modèle : il doit toujours respecter le contrat, puisqu'on le copie.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { jeu } from '../../src/games/_modele/index.ts';
import { verifierModule } from './verifier-module.ts';

describe('module modèle (_modele)', () => {
  test('respecte le contrat des modules de jeu', async () => {
    await verifierModule('_modele', jeu);
  });

  test('une case donnée ne peut pas être modifiée', async () => {
    const logique = await jeu.chargerLogique();
    const donnees = { donnes: [1, 2, 3, 4, 5, 0], solution: [1, 2, 3, 4, 5, 6] };
    const etat = logique.etatInitial(donnees);
    assert.equal(logique.appliquer(etat, { type: 'effacer', cellule: 0 }, donnees), etat);
  });

  test('les notes basculent et une erreur est signalée', async () => {
    const logique = await jeu.chargerLogique();
    const donnees = { donnes: [1, 2, 3, 4, 5, 0], solution: [1, 2, 3, 4, 5, 6] };
    let etat = logique.etatInitial(donnees);
    etat = logique.appliquer(etat, { type: 'noter', cellule: 5, valeur: 6 }, donnees);
    assert.deepEqual(etat.notes[5], [6]);
    etat = logique.appliquer(etat, { type: 'noter', cellule: 5, valeur: 6 }, donnees);
    assert.deepEqual(etat.notes[5], []);
    etat = logique.appliquer(etat, { type: 'placer', cellule: 5, valeur: 3 }, donnees);
    assert.deepEqual(logique.erreurs(etat, donnees), [5]);
  });
});
