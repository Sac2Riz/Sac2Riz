// Tests de la technique « longueur unique » (Débutant).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { structureDe } from '../../../../src/games/chiffres-cases/probleme.ts';
import { etatDepart, placer } from '../../../../src/games/chiffres-cases/solveur/etat.ts';
import { longueurUnique } from '../../../../src/games/chiffres-cases/solveur/techniques/longueur-unique.ts';
import { donneesDe, H1, n, structureA, V1, V3 } from '../aide.ts';

describe('technique : longueur unique', () => {
  test('le seul nombre d\'une longueur va dans le seul emplacement de cette longueur', () => {
    // 1 2 #     H L1C1 = 12, V L1C1 = 134 (seul nombre de 3 chiffres), H L3C1 = 45
    // 3 # #
    // 4 5 #
    const { probleme: p } = structureDe(donneesDe(['12#', '3##', '45#']));
    const etape = longueurUnique.chercher(p, etatDepart(p, []));
    assert.ok(etape !== null);
    assert.deepEqual(etape.placements, [{ emplacement: 1, nombre: n(p, '134') }]);
    assert.match(etape.explication, /134 est le seul nombre de 3 chiffres/);
  });

  test('le dernier nombre d\'une longueur, quand il ne reste qu\'un emplacement', () => {
    const { p } = structureA();
    let etat = etatDepart(p, []);
    etat = placer(p, etat, H1, n(p, '123'));
    etat = placer(p, etat, V1, n(p, '146'));
    etat = placer(p, etat, V3, n(p, '358'));
    const etape = longueurUnique.chercher(p, etat);
    assert.deepEqual(etape?.placements, [{ emplacement: 3, nombre: n(p, '678') }]);
    assert.match(etape?.explication ?? '', /dernier nombre de 3 chiffres/);
  });

  test('rien si plusieurs emplacements de chaque longueur restent vides', () => {
    const { p } = structureA();
    assert.equal(longueurUnique.chercher(p, etatDepart(p, [])), null);
  });
});
