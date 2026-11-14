// Tests du solveur par backtracking (comptage de solutions, unicité).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compterSolutions, estUnique } from '../../src/moteur/backtracking.ts';
import {
  cage,
  definitionClassique,
  regionsClassiques,
  regionsDiagonales,
  valeursUnA,
} from '../../src/moteur/regions.ts';
import { conflits, estSolution } from '../../src/moteur/validation.ts';
import type { DefinitionGrille } from '../../src/types/grille.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { ENONCE_DIFFICILE, ENONCE_UNIQUE, SOLUTION_UNIQUE } from './grilles-connues.ts';

const def9 = definitionClassique(9, 3, 3);
const def4 = definitionClassique(4, 2, 2);
const vide = (n: number): number[] => new Array<number>(n).fill(0);

describe('compterSolutions — sudoku classique', () => {
  test('grille à solution unique : 1 solution, la bonne', () => {
    const r = compterSolutions(def9, ENONCE_UNIQUE);
    assert.equal(r.nombre, 1);
    assert.equal(r.interrompu, false);
    assert.deepEqual(r.solution, SOLUTION_UNIQUE);
    assert.ok(estUnique(def9, ENONCE_UNIQUE));
  });

  test('grille très difficile : unique et solution valide', () => {
    const r = compterSolutions(def9, ENONCE_DIFFICILE);
    assert.equal(r.nombre, 1);
    assert.ok(r.solution !== null && estSolution(def9, r.solution));
    // La solution respecte les chiffres donnés
    ENONCE_DIFFICILE.forEach((v, c) => {
      if (v !== 0) assert.equal(r.solution?.[c], v);
    });
  });

  test('grille à plusieurs solutions : arrêt à 2', () => {
    const grille = [...ENONCE_UNIQUE];
    // Retirer beaucoup de chiffres rend la grille ambiguë
    for (let c = 0; c < 40; c++) grille[c] = 0;
    const r = compterSolutions(def9, grille);
    assert.equal(r.nombre, 2);
    assert.ok(!estUnique(def9, grille));
  });

  test('grille contradictoire : 0 solution', () => {
    const doublon = [...ENONCE_UNIQUE];
    doublon[2] = 5; // deux 5 sur la première ligne
    assert.equal(compterSolutions(def9, doublon).nombre, 0);
    // Pas de doublon visible, mais impasse : en 4x4, la case 0 ne peut plus rien recevoir
    // (1 et 2 sur sa ligne, 3 dans sa colonne, 4 dans son bloc)
    const impasse = [0, 0, 1, 2, 0, 4, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0];
    assert.deepEqual(conflits(def4, impasse), []);
    assert.equal(compterSolutions(def4, impasse).nombre, 0);
    // Valeur non autorisée
    const horsLimite = [...ENONCE_UNIQUE];
    horsLimite[2] = 10;
    assert.equal(compterSolutions(def9, horsLimite).nombre, 0);
  });

  test('le 4x4 vide a exactement 288 solutions', () => {
    const r = compterSolutions(def4, vide(16), { limite: 1000 });
    assert.equal(r.nombre, 288);
    assert.equal(r.interrompu, false);
  });

  test('ne modifie pas la grille fournie', () => {
    const grille = Object.freeze([...ENONCE_UNIQUE]);
    compterSolutions(def9, grille);
    assert.deepEqual(grille, ENONCE_UNIQUE);
  });

  test('noeudsMax interrompt la recherche', () => {
    const r = compterSolutions(def9, vide(81), { limite: 1_000_000, noeudsMax: 50 });
    assert.equal(r.interrompu, true);
    assert.ok(r.noeuds <= 51);
  });

  test('alea : remplissage aléatoire reproductible', () => {
    const a = compterSolutions(def9, vide(81), { limite: 1, alea: creerAlea(5) });
    const b = compterSolutions(def9, vide(81), { limite: 1, alea: creerAlea(5) });
    const c = compterSolutions(def9, vide(81), { limite: 1, alea: creerAlea(6) });
    assert.ok(a.solution !== null && estSolution(def9, a.solution));
    assert.deepEqual(a.solution, b.solution);
    assert.notDeepEqual(a.solution, c.solution);
  });

  test('taille incorrecte : erreur', () => {
    assert.throws(() => compterSolutions(def9, [1, 2, 3]));
  });
});

describe('compterSolutions — variantes', () => {
  test('sudoku diagonal 4x4 : chaque solution respecte les diagonales', () => {
    const def: DefinitionGrille = { ...def4, regions: [...regionsClassiques(4, 2, 2), ...regionsDiagonales(4)] };
    const r = compterSolutions(def, vide(16), { limite: 1000 });
    assert.ok(r.nombre > 0 && r.nombre < 288);
    assert.ok(r.solution !== null && estSolution(def, r.solution));
  });

  test('6x6 (blocs 2×3) : solution valide', () => {
    const def6 = definitionClassique(6, 2, 3);
    const r = compterSolutions(def6, vide(36), { limite: 1 });
    assert.ok(r.solution !== null && estSolution(def6, r.solution));
  });
});

describe('compterSolutions — cages (régions somme)', () => {
  function cageDeHuit(distinctes: boolean): DefinitionGrille {
    return { lignes: 1, colonnes: 2, valeurs: valeursUnA(9), regions: [cage([0, 1], 8, distinctes)], domaines: null };
  }

  test('cage de 8 sur deux cases : 6 solutions, jamais 4+4', () => {
    const def = cageDeHuit(true);
    // On énumère les solutions en fixant la première case
    const trouvees: number[][] = [];
    for (let v = 1; v <= 9; v++) {
      const r = compterSolutions(def, [v, 0], { limite: 10 });
      assert.ok(r.nombre <= 1);
      if (r.solution) trouvees.push(r.solution);
    }
    assert.deepEqual(trouvees, [[1, 7], [2, 6], [3, 5], [5, 3], [6, 2], [7, 1]]);
    assert.equal(compterSolutions(def, [0, 0], { limite: 100 }).nombre, 6);
    assert.equal(compterSolutions(def, [4, 0]).nombre, 0);
    assert.equal(compterSolutions(def, [4, 4]).nombre, 0);
  });

  test('cage de 8 non distincte : 4+4 accepté (7 solutions)', () => {
    const def = cageDeHuit(false);
    assert.equal(compterSolutions(def, [0, 0], { limite: 100 }).nombre, 7);
    assert.deepEqual(compterSolutions(def, [4, 0]).solution, [4, 4]);
  });

  test('cage de 3 cases (total 6) : seulement les permutations de 1+2+3', () => {
    const def: DefinitionGrille = { lignes: 1, colonnes: 3, valeurs: valeursUnA(9), regions: [cage([0, 1, 2], 6)], domaines: null };
    assert.equal(compterSolutions(def, [0, 0, 0], { limite: 100 }).nombre, 6);
  });

  test('killer 4x4 : cages tirées d\'une solution → solution valide qui respecte les cages', () => {
    const solution = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
    // Cages horizontales de deux cases
    const cages = Array.from({ length: 8 }, (_, i) => {
      const c = i * 2;
      return cage([c, c + 1], (solution[c] ?? 0) + (solution[c + 1] ?? 0));
    });
    const def: DefinitionGrille = { ...def4, regions: [...def4.regions, ...cages] };
    const r = compterSolutions(def, vide(16), { limite: 1000 });
    assert.ok(r.nombre >= 1);
    assert.ok(r.solution !== null && estSolution(def, r.solution));
    assert.equal(compterSolutions(def, solution).nombre, 1);
  });
});
