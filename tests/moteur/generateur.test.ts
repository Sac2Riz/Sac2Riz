// Tests du générateur : validité, unicité, reproductibilité, symétrie, fonction d'acceptation.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { estUnique } from '../../src/moteur/backtracking.ts';
import {
  genererGrille,
  genererGrilleComplete,
  retirerChiffres,
  type EtatRetrait,
} from '../../src/moteur/generateur.ts';
import { cage, definitionClassique, regionsClassiques, regionsDiagonales } from '../../src/moteur/regions.ts';
import { estSolution } from '../../src/moteur/validation.ts';
import type { DefinitionGrille, ValeursGrille } from '../../src/types/grille.ts';
import { creerAlea } from '../../src/utils/alea.ts';

const def9 = definitionClassique(9, 3, 3);
const compterIndices = (g: ValeursGrille): number => g.filter((v) => v !== 0).length;

/** Vrai si chaque case vide a son symétrique central vide aussi. */
function estSymetrique(enonce: ValeursGrille): boolean {
  const n = enonce.length;
  return enonce.every((v, c) => (v === 0) === (enonce[n - 1 - c] === 0));
}

/** Vérifie qu'un énoncé est unique et compatible avec sa solution. */
function verifierGrille(def: DefinitionGrille, enonce: ValeursGrille, solution: ValeursGrille): void {
  assert.ok(estSolution(def, solution), 'solution invalide');
  enonce.forEach((v, c) => {
    if (v !== 0) assert.equal(v, solution[c], `case ${c} différente de la solution`);
  });
  assert.ok(estUnique(def, enonce), 'énoncé non unique');
}

describe('genererGrilleComplete', () => {
  test('produit une grille 9x9 complète et valide', () => {
    for (let graine = 1; graine <= 5; graine++) {
      assert.ok(estSolution(def9, genererGrilleComplete(def9, creerAlea(graine))));
    }
  });

  test('fonctionne avec des cages (killer 4x4)', () => {
    const def4 = definitionClassique(4, 2, 2);
    const def: DefinitionGrille = { ...def4, regions: [...def4.regions, cage([0, 1], 3), cage([14, 15], 7)] };
    const grille = genererGrilleComplete(def, creerAlea(3));
    assert.ok(estSolution(def, grille));
  });
});

describe('genererGrille — sudoku 9x9', () => {
  test('énoncé unique, compatible avec la solution', () => {
    for (let graine = 1; graine <= 5; graine++) {
      const { enonce, solution } = genererGrille(def9, creerAlea(graine));
      verifierGrille(def9, enonce, solution);
      assert.ok(compterIndices(enonce) < 40, 'trop peu de chiffres retirés');
    }
  });

  test('même graine → même grille ; graines différentes → grilles différentes', () => {
    const a = genererGrille(def9, creerAlea(42));
    const b = genererGrille(def9, creerAlea(42));
    const c = genererGrille(def9, creerAlea(43));
    assert.deepEqual(a, b);
    assert.notDeepEqual(a.enonce, c.enonce);
  });

  test('symétrie centrale par défaut', () => {
    for (let graine = 1; graine <= 5; graine++) {
      assert.ok(estSymetrique(genererGrille(def9, creerAlea(graine)).enonce));
    }
  });

  test('symétrie « aucune » : grilles uniques, pas toujours symétriques', () => {
    let asymetriques = 0;
    for (let graine = 1; graine <= 5; graine++) {
      const { enonce, solution } = genererGrille(def9, creerAlea(graine), { symetrie: 'aucune' });
      verifierGrille(def9, enonce, solution);
      if (!estSymetrique(enonce)) asymetriques++;
    }
    assert.ok(asymetriques > 0);
  });

  test('indicesMin est respecté', () => {
    const { enonce } = genererGrille(def9, creerAlea(7), { indicesMin: 40 });
    assert.ok(compterIndices(enonce) >= 40);
  });

  test('ne modifie pas la solution fournie', () => {
    const solution = Object.freeze(genererGrilleComplete(def9, creerAlea(8)));
    const copie = [...solution];
    retirerChiffres(def9, solution, creerAlea(8));
    assert.deepEqual(solution, copie);
  });

  test('refuse une solution invalide', () => {
    assert.throws(() => retirerChiffres(def9, new Array<number>(81).fill(1), creerAlea(1)));
  });
});

describe('retirerChiffres — fonction d\'acceptation', () => {
  const solution = genererGrilleComplete(def9, creerAlea(11));

  test('appelée uniquement sur des énoncés uniques, avec un état cohérent', () => {
    const etats: EtatRetrait[] = [];
    const enonce = retirerChiffres(def9, solution, creerAlea(11), {
      accepter: (etat) => {
        etats.push(etat);
        return 'continuer';
      },
    });
    assert.ok(etats.length > 0);
    for (const etat of etats) {
      assert.ok(estUnique(def9, etat.enonce));
      assert.equal(compterIndices(etat.enonce), etat.nombreIndices);
      assert.ok(etat.cellulesRetirees.every((c) => etat.enonce[c] === 0));
    }
    // « continuer » partout = même résultat que sans fonction
    assert.deepEqual(enonce, retirerChiffres(def9, solution, creerAlea(11)));
  });

  test('« arreter » termine le retrait (ex. Débutant : garder au moins 45 chiffres)', () => {
    const enonce = retirerChiffres(def9, solution, creerAlea(11), {
      accepter: (etat) => (etat.nombreIndices <= 46 ? 'arreter' : 'continuer'),
    });
    const n = compterIndices(enonce);
    assert.ok(n >= 44 && n <= 46, `${n} chiffres`);
    assert.ok(estUnique(def9, enonce));
  });

  test('« refuser » remet les chiffres retirés', () => {
    // Refuser tout retrait touchant la première ligne
    const enonce = retirerChiffres(def9, solution, creerAlea(11), {
      accepter: (etat) => (etat.cellulesRetirees.some((c) => c < 9) ? 'refuser' : 'continuer'),
    });
    for (let c = 0; c < 9; c++) assert.equal(enonce[c], solution[c]);
    assert.ok(estUnique(def9, enonce));
    // Tout refuser rend la solution intacte
    assert.deepEqual(retirerChiffres(def9, solution, creerAlea(11), { accepter: () => 'refuser' }), solution);
  });
});

describe('genererGrille — autres variantes', () => {
  test('4x4, 6x6 et diagonal 9x9 : énoncés uniques', () => {
    const def4 = definitionClassique(4, 2, 2);
    const def6 = definitionClassique(6, 2, 3);
    const defDiag: DefinitionGrille = { ...def9, regions: [...regionsClassiques(9, 3, 3), ...regionsDiagonales(9)] };
    for (const def of [def4, def6, defDiag]) {
      for (let graine = 1; graine <= 3; graine++) {
        const { enonce, solution } = genererGrille(def, creerAlea(graine));
        verifierGrille(def, enonce, solution);
        assert.ok(estSymetrique(enonce));
      }
    }
  });
});

describe('performances', () => {
  test('20 grilles 9x9 en moins de 5 secondes', () => {
    const debut = performance.now();
    for (let graine = 100; graine < 120; graine++) genererGrille(def9, creerAlea(graine));
    const duree = performance.now() - debut;
    assert.ok(duree < 5000, `${duree.toFixed(0)} ms`);
  });
});
