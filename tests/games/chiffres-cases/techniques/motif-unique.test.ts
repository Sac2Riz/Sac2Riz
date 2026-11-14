// Tests de la technique « un seul nombre possible » (Débutant) et de la tenue des candidats.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { etatDepart } from '../../../../src/games/chiffres-cases/solveur/etat.ts';
import { motifUnique } from '../../../../src/games/chiffres-cases/solveur/techniques/motif-unique.ts';
import { candidatsTexte, H1, n, structureA, V1, V3 } from '../aide.ts';

describe('technique : un seul nombre possible', () => {
  test('placer un nombre filtre les emplacements croisés et retire le nombre des autres', () => {
    const { p } = structureA();
    const etat = etatDepart(p, [{ emplacement: H1, nombre: n(p, '123') }]);
    assert.deepEqual(candidatsTexte(p, etat, V1), ['146']); // commence par 1, 123 déjà pris
    assert.deepEqual(candidatsTexte(p, etat, V3), ['358']); // commence par 3
  });

  test('seul nombre compatible avec les chiffres écrits → placé, motif cité', () => {
    const { p } = structureA();
    const etape = motifUnique.chercher(p, etatDepart(p, [{ emplacement: H1, nombre: n(p, '123') }]));
    assert.ok(etape !== null);
    assert.equal(etape.technique, 'motif-unique');
    assert.deepEqual(etape.placements, [{ emplacement: V1, nombre: n(p, '146') }]);
    assert.match(etape.explication, /seul 146 peut aller dans le vertical en L1C1 avec les chiffres déjà écrits \(1··\)/);
    assert.ok(etape.motif.includes(V3) === false);
  });

  test('rien quand chaque emplacement a plusieurs candidats', () => {
    const { p } = structureA();
    assert.equal(motifUnique.chercher(p, etatDepart(p, [])), null);
  });
});
