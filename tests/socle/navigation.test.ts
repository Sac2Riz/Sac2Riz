// Tests de la navigation entre les écrans (code pur) : parents, profondeurs, retour d'Android.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  ACCUEIL,
  ancetre,
  changementHistorique,
  memeEcran,
  parent,
  profondeur,
  type Ecran,
} from '../../src/socle/navigation.ts';

const FICHE: Ecran = { type: 'fiche', jeu: 'sudoku-classique' };
const PARTIE: Ecran = { type: 'partie', jeu: 'sudoku-classique' };
const FIN: Ecran = { type: 'fin', jeu: 'sudoku-classique' };
const STATS_TOUS: Ecran = { type: 'stats', jeu: null };
const STATS_JEU: Ecran = { type: 'stats', jeu: 'sudoku-classique' };

describe('navigation', () => {
  test('parents : partie → fiche du jeu → accueil', () => {
    assert.equal(parent(ACCUEIL), null);
    assert.deepEqual(parent(FICHE), ACCUEIL);
    assert.deepEqual(parent(PARTIE), FICHE);
    assert.deepEqual(parent(FIN), FICHE);
    assert.deepEqual(parent(STATS_TOUS), ACCUEIL);
    assert.deepEqual(parent(STATS_JEU), FICHE);
  });

  test('profondeurs', () => {
    assert.equal(profondeur(ACCUEIL), 0);
    assert.equal(profondeur(FICHE), 1);
    assert.equal(profondeur(STATS_TOUS), 1);
    assert.equal(profondeur(PARTIE), 2);
    assert.equal(profondeur(FIN), 2);
    assert.equal(profondeur(STATS_JEU), 2);
  });

  test('retour vers une profondeur : ancêtre de l\'écran courant', () => {
    assert.deepEqual(ancetre(PARTIE, 1), FICHE);
    assert.deepEqual(ancetre(PARTIE, 0), ACCUEIL);
    assert.deepEqual(ancetre(STATS_JEU, 1), FICHE);
    assert.deepEqual(ancetre(FICHE, 0), ACCUEIL);
    assert.deepEqual(ancetre(FICHE, 3), FICHE, 'pas plus profond que l\'écran lui-même');
    assert.deepEqual(ancetre(PARTIE, -1), ACCUEIL);
  });

  test('historique : une entrée en descendant, remplacée à même profondeur', () => {
    assert.equal(changementHistorique(ACCUEIL, FICHE), 'ajouter');
    assert.equal(changementHistorique(FICHE, PARTIE), 'ajouter');
    assert.equal(changementHistorique(PARTIE, FIN), 'remplacer', 'la fin de partie remplace la partie');
    assert.equal(changementHistorique(FIN, PARTIE), 'remplacer', 'la partie suivante remplace la fin');
    assert.equal(changementHistorique(FICHE, STATS_JEU), 'ajouter');
  });

  test('même écran', () => {
    assert.ok(memeEcran(FICHE, { type: 'fiche', jeu: 'sudoku-classique' }));
    assert.equal(memeEcran(FICHE, { type: 'fiche', jeu: 'chiffres-cases' }), false);
    assert.equal(memeEcran(STATS_TOUS, STATS_JEU), false);
    assert.ok(memeEcran(ACCUEIL, { type: 'accueil' }));
  });
});
