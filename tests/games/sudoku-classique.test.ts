// Tests propres au sudoku classique : règles des actions (retrait automatique des notes),
// gardes de type, indices, chiffres restants du pavé et conversion des packs.
// (Le contrat commun est vérifié par registre.test.ts.)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { blocDe, colonneDe, ligneDe, VOISINES } from '../../src/games/sudoku-classique/geometrie.ts';
import { logique } from '../../src/games/sudoku-classique/logique.ts';
import { convertirPack, NIVEAUX_AVEC_PACK } from '../../src/games/sudoku-classique/packs.ts';
import type { ActionSudoku, DonneesSudoku, EtatSudoku } from '../../src/games/sudoku-classique/types.ts';
import { vue } from '../../src/games/sudoku-classique/vue.ts';
import { estPackSudoku } from '../../src/moteur/pack.ts';
import type { Json } from '../../src/types/json.ts';
import { ENONCE_UNIQUE, SOLUTION_UNIQUE } from '../moteur/grilles-connues.ts';

const donnees: DonneesSudoku = { enonce: ENONCE_UNIQUE, solution: SOLUTION_UNIQUE };
const vides = ENONCE_UNIQUE.flatMap((v, i) => (v === 0 ? [i] : []));
const caseVide = (condition: (c: number) => boolean): number => {
  const c = vides.find(condition);
  if (c === undefined) throw new Error('aucune case vide ne convient');
  return c;
};

function jouerTout(etat: EtatSudoku, actions: readonly ActionSudoku[]): EtatSudoku {
  return actions.reduce((e, a) => logique.appliquer(e, a, donnees), etat);
}

describe('géométrie 9 × 9', () => {
  test('chaque case voit exactement 20 cases (8 de sa ligne, 8 de sa colonne, 4 autres du bloc)', () => {
    for (const voisines of VOISINES) assert.equal(voisines.length, 20);
  });

  test('ligne, colonne et bloc', () => {
    assert.deepEqual([ligneDe(40), colonneDe(40), blocDe(40)], [4, 4, 4]);
    assert.deepEqual([ligneDe(80), colonneDe(80), blocDe(80)], [8, 8, 8]);
    assert.equal(blocDe(5), 1);
  });
});

describe('sudoku : actions', () => {
  const cible = caseVide(() => true);
  const meme = (c: number): boolean => c !== cible;
  // Une case vide qui voit la cible, et une qui ne la voit pas
  const voisine = caseVide((c) => meme(c) && VOISINES[cible]?.includes(c) === true);
  const lointaine = caseVide((c) => meme(c) && VOISINES[cible]?.includes(c) === false);

  test('placer un chiffre retire cette note de la ligne, de la colonne et du bloc, et seulement elle', () => {
    let etat = logique.etatInitial(donnees);
    etat = jouerTout(etat, [
      { type: 'noter', cellule: voisine, valeur: 5 },
      { type: 'noter', cellule: voisine, valeur: 7 },
      { type: 'noter', cellule: lointaine, valeur: 5 },
      { type: 'noter', cellule: cible, valeur: 2 },
    ]);
    const apres = logique.appliquer(etat, { type: 'placer', cellule: cible, valeur: 5 }, donnees);
    assert.equal(apres.valeurs[cible], 5);
    assert.deepEqual(apres.notes[cible], [], 'la case remplie perd ses notes');
    assert.deepEqual(apres.notes[voisine], [7], 'la voisine perd seulement la note 5');
    assert.deepEqual(apres.notes[lointaine], [5], 'une case qui ne voit pas la cible garde ses notes');
    assert.deepEqual(etat.notes[voisine], [5, 7], 'l\'ancien état est intact (annuler le retrouve)');
  });

  test('les notes sont triées et basculent', () => {
    let etat = logique.etatInitial(donnees);
    etat = jouerTout(etat, [
      { type: 'noter', cellule: cible, valeur: 8 },
      { type: 'noter', cellule: cible, valeur: 3 },
    ]);
    assert.deepEqual(etat.notes[cible], [3, 8]);
    etat = logique.appliquer(etat, { type: 'noter', cellule: cible, valeur: 8 }, donnees);
    assert.deepEqual(etat.notes[cible], [3]);
  });

  test('actions sans effet : l\'état reçu est renvoyé tel quel', () => {
    const initial = logique.etatInitial(donnees);
    const donnee = ENONCE_UNIQUE.findIndex((v) => v !== 0);
    assert.equal(logique.appliquer(initial, { type: 'placer', cellule: donnee, valeur: 1 }, donnees), initial);
    assert.equal(logique.appliquer(initial, { type: 'effacer', cellule: donnee }, donnees), initial);
    assert.equal(logique.appliquer(initial, { type: 'effacer', cellule: cible }, donnees), initial, 'case déjà vide');
    const rempli = logique.appliquer(initial, { type: 'placer', cellule: cible, valeur: 4 }, donnees);
    assert.equal(logique.appliquer(rempli, { type: 'placer', cellule: cible, valeur: 4 }, donnees), rempli);
    assert.equal(logique.appliquer(rempli, { type: 'noter', cellule: cible, valeur: 1 }, donnees), rempli, 'pas de note sur une case remplie');
  });

  test('effacer vide le chiffre et les notes', () => {
    const etat = jouerTout(logique.etatInitial(donnees), [
      { type: 'placer', cellule: cible, valeur: 4 },
      { type: 'effacer', cellule: cible },
    ]);
    assert.equal(etat.valeurs[cible], 0);
    assert.deepEqual(etat.notes[cible], []);
  });

  test('erreurs : seules les cases saisies fausses', () => {
    const juste = SOLUTION_UNIQUE[cible] ?? 1;
    const faux = (juste % 9) + 1;
    const etat = jouerTout(logique.etatInitial(donnees), [
      { type: 'placer', cellule: cible, valeur: faux },
      { type: 'placer', cellule: lointaine, valeur: SOLUTION_UNIQUE[lointaine] ?? 1 },
    ]);
    assert.deepEqual(logique.erreurs(etat, donnees), [cible]);
  });
});

describe('sudoku : indices', () => {
  test('un chiffre faux est signalé en premier (action : l\'effacer)', () => {
    const cible = vides[0] ?? 0;
    const faux = ((SOLUTION_UNIQUE[cible] ?? 1) % 9) + 1;
    const etat = logique.appliquer(logique.etatInitial(donnees), { type: 'placer', cellule: cible, valeur: faux }, donnees);
    const indice = logique.indice(etat, donnees);
    assert.deepEqual(indice?.action, { type: 'effacer', cellule: cible });
  });

  test('sinon, un placement juste avec une explication', () => {
    const indice = logique.indice(logique.etatInitial(donnees), donnees);
    assert.ok(indice !== null && indice.action.type === 'placer');
    assert.equal(indice.action.valeur, SOLUTION_UNIQUE[indice.action.cellule]);
    assert.ok(indice.explication.length > 0);
    assert.ok(indice.cellules.includes(indice.action.cellule));
  });

  test('aucun indice sur une grille terminée', () => {
    const fini: EtatSudoku = { valeurs: SOLUTION_UNIQUE, notes: SOLUTION_UNIQUE.map(() => []) };
    assert.equal(logique.indice(fini, donnees), null);
  });
});

describe('sudoku : gardes de type', () => {
  test('données : énoncé cohérent avec une vraie solution', () => {
    assert.ok(logique.estDonnees(donnees));
    const autreChiffre = ENONCE_UNIQUE.map((v, i) => (i === vides[0] ? ((SOLUTION_UNIQUE[i] ?? 1) % 9) + 1 : v));
    assert.equal(logique.estDonnees({ enonce: autreChiffre, solution: SOLUTION_UNIQUE }), false, 'chiffre donné ≠ solution');
    const solutionFausse = SOLUTION_UNIQUE.map((v, i) => (i === 0 ? ((v % 9) + 1) : v));
    const enonceVide = ENONCE_UNIQUE.map(() => 0);
    assert.equal(logique.estDonnees({ enonce: enonceVide, solution: solutionFausse }), false, 'solution invalide');
    assert.equal(logique.estDonnees({ enonce: ENONCE_UNIQUE.slice(1), solution: SOLUTION_UNIQUE }), false);
  });

  test('état : notes triées sans doublon, aucune note sur une case remplie', () => {
    const initial: Json = logique.etatInitial(donnees);
    assert.ok(logique.estEtat(initial));
    const notesAvec = (n: Json): Json => ({ valeurs: ENONCE_UNIQUE, notes: ENONCE_UNIQUE.map((_, i) => (i === vides[0] ? n : [])) });
    assert.ok(logique.estEtat(notesAvec([1, 4])));
    assert.equal(logique.estEtat(notesAvec([4, 1])), false);
    assert.equal(logique.estEtat(notesAvec([4, 4])), false);
    assert.equal(logique.estEtat(notesAvec([0])), false);
    const donnee = ENONCE_UNIQUE.findIndex((v) => v !== 0);
    assert.equal(logique.estEtat({ valeurs: ENONCE_UNIQUE, notes: ENONCE_UNIQUE.map((_, i) => (i === donnee ? [1] : [])) }), false);
  });

  test('actions', () => {
    assert.ok(logique.estAction({ type: 'placer', cellule: 80, valeur: 9 }));
    assert.ok(logique.estAction({ type: 'effacer', cellule: 0 }));
    assert.equal(logique.estAction({ type: 'placer', cellule: 81, valeur: 1 }), false);
    assert.equal(logique.estAction({ type: 'noter', cellule: 3, valeur: 0 }), false);
    assert.equal(logique.estAction({ type: 'gommer', cellule: 3 }), false);
  });
});

describe('sudoku : pavé', () => {
  test('chiffres restants = 9 moins ceux déjà posés', () => {
    const restants = vue.restants(logique.etatInitial(donnees), donnees);
    assert.ok(restants !== null);
    for (let v = 1; v <= 9; v++) {
      const poses = ENONCE_UNIQUE.filter((x) => x === v).length;
      assert.equal(restants[String(v)], 9 - poses);
    }
    const fini: EtatSudoku = { valeurs: SOLUTION_UNIQUE, notes: SOLUTION_UNIQUE.map(() => []) };
    assert.ok(Object.values(vue.restants(fini, donnees) ?? { x: 1 }).every((n) => n === 0));
  });
});

describe('sudoku : packs', () => {
  for (const niveau of NIVEAUX_AVEC_PACK) {
    test(`pack ${niveau} converti en grilles jouables`, () => {
      const url = new URL(`../../src/games/sudoku-classique/packs/${niveau}.json`, import.meta.url);
      const pack: unknown = JSON.parse(readFileSync(url, 'utf8'));
      assert.ok(estPackSudoku(pack));
      const puzzles = convertirPack(pack);
      assert.equal(puzzles.length, pack.grilles.length);
      for (const puzzle of puzzles) {
        assert.equal(puzzle.jeu, 'sudoku-classique');
        assert.equal(puzzle.notation.niveau, niveau);
        assert.ok(logique.estDonnees(puzzle.donnees));
      }
    });
  }
});
