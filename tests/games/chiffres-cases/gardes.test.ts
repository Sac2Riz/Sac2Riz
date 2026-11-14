// Tests des gardes de type des chiffres casés (relecture des sauvegardes et imports).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { logique } from '../../../src/games/chiffres-cases/logique.ts';
import type { Json } from '../../../src/types/json.ts';
import { donneesDe, GRILLE_A } from './aide.ts';

describe('chiffres casés : gardes', () => {
  test('données valides acceptées, y compris après un aller-retour JSON', () => {
    const d = donneesDe(GRILLE_A, [0]);
    assert.ok(logique.estDonnees(d));
    assert.ok(logique.estDonnees(JSON.parse(JSON.stringify(d))));
  });

  test('données invalides refusées', () => {
    const invalides: Json[] = [
      donneesDe(['023', '4#5', '678']), // nombre commençant par 0
      donneesDe(['121', '2#2', '121']), // 121 en double
      donneesDe(['12#', '###', '#34']), // cases blanches en deux morceaux
      donneesDe(['1#2', '###', '3#4']), // aucun emplacement (et cases isolées)
      { ...donneesDe(GRILLE_A), preplaces: [4] }, // emplacement inexistant
      { ...donneesDe(GRILLE_A), preplaces: [2, 1] }, // pas trié
      { ...donneesDe(GRILLE_A), largeur: 4 }, // taille incohérente
      { ...donneesDe(GRILLE_A), solution: [1, 2, 3, 4, -1, 5, 6, 7, 10] }, // chiffre hors bornes
    ];
    for (const d of invalides) assert.equal(logique.estDonnees(d), false, JSON.stringify(d));
  });

  test('états et actions', () => {
    assert.ok(logique.estEtat({ places: ['123', null, '45'] }));
    assert.equal(logique.estEtat({ places: ['123', '123'] }), false); // un nombre posé deux fois
    assert.equal(logique.estEtat({ places: ['0123'] }), false);
    assert.equal(logique.estEtat({ places: [] }), false);
    assert.ok(logique.estAction({ type: 'placer', emplacement: 3, nombre: '4567' }));
    assert.ok(logique.estAction({ type: 'effacer', emplacement: 0 }));
    assert.equal(logique.estAction({ type: 'placer', emplacement: 3, nombre: '7' }), false);
    assert.equal(logique.estAction({ type: 'placer', emplacement: -1, nombre: '45' }), false);
    assert.equal(logique.estAction({ type: 'noter', emplacement: 1 }), false);
  });
});
