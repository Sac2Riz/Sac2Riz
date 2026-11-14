// Tests des indices du sudoku classique (en deux temps : marques + explication, puis action) :
// chiffre faux d'abord, première étape du solveur, notes du joueur fiables ou non, éliminations,
// réglage du retrait automatique des notes, partie complète jouée aux indices.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { etatPourIndice } from '../../src/games/sudoku-classique/indice.ts';
import { logique } from '../../src/games/sudoku-classique/logique.ts';
import { convertirPack } from '../../src/games/sudoku-classique/packs.ts';
import type { ActionSudoku, DonneesSudoku, EtatSudoku } from '../../src/games/sudoku-classique/types.ts';
import { masqueComplet, valeursDuMasque } from '../../src/moteur/candidats.ts';
import { estPackSudoku } from '../../src/moteur/pack.ts';
import type { Indice, ValeursReglagesJeu } from '../../src/types/jeu.ts';
import { ENONCE_UNIQUE, SOLUTION_UNIQUE } from '../moteur/grilles-connues.ts';

const AVEC_RETRAIT: ValeursReglagesJeu = { retraitAutoNotes: true };
const donnees: DonneesSudoku = { enonce: ENONCE_UNIQUE, solution: SOLUTION_UNIQUE };
const vides = ENONCE_UNIQUE.flatMap((v, i) => (v === 0 ? [i] : []));

/** Première grille du pack Expert : elle demande des éliminations avant certains placements. */
function grilleExpert(): DonneesSudoku {
  const url = new URL('../../src/games/sudoku-classique/packs/expert.json', import.meta.url);
  const pack: unknown = JSON.parse(readFileSync(url, 'utf8'));
  assert.ok(estPackSudoku(pack));
  const premiere = convertirPack(pack)[0];
  assert.ok(premiere !== undefined);
  return premiere.donnees;
}

/** Joue les indices jusqu'au premier qui retire des candidats ; renvoie l'état juste avant et cet indice. */
function jusquAElimination(d: DonneesSudoku): { etat: EtatSudoku; indice: Indice<ActionSudoku> } {
  let etat = logique.etatInitial(d);
  for (let coups = 0; coups < 200; coups++) {
    const indice = logique.indice(etat, d, AVEC_RETRAIT);
    assert.ok(indice !== null);
    if (indice.action.type === 'definir-notes') return { etat, indice };
    etat = logique.appliquer(etat, indice.action, d);
  }
  throw new Error('aucun indice d\'élimination trouvé');
}

describe('indices du sudoku', () => {
  test('un chiffre faux est signalé en premier (action : l\'effacer)', () => {
    const cible = vides[0] ?? 0;
    const faux = ((SOLUTION_UNIQUE[cible] ?? 1) % 9) + 1;
    const etat = logique.appliquer(logique.etatInitial(donnees), { type: 'placer', cellule: cible, valeur: faux }, donnees);
    const indice = logique.indice(etat, donnees, AVEC_RETRAIT);
    assert.ok(indice !== null);
    assert.deepEqual(indice.action, { type: 'effacer', cellule: cible });
    assert.equal(indice.titre, 'Chiffre faux');
    assert.deepEqual(indice.marques.cellules, [cible]);
  });

  test('placement : technique nommée, explication, case mise en évidence, chiffre juste', () => {
    const indice = logique.indice(logique.etatInitial(donnees), donnees, AVEC_RETRAIT);
    assert.ok(indice !== null && indice.action.type === 'placer');
    const { cellule, valeur } = indice.action;
    assert.equal(valeur, SOLUTION_UNIQUE[cellule]);
    assert.ok(indice.titre.length > 0 && indice.explication.length > 0);
    assert.ok(indice.marques.cellules.includes(cellule));
    assert.deepEqual(indice.marques.placements, [{ cellule, valeur }]);
    assert.ok(indice.marques.zones.length >= 9, 'au moins une région entière (9 cases) mise en évidence');
    assert.match(indice.libelleAction, new RegExp(`Placer le ${valeur}`));
  });

  test('sans retrait automatique des notes : l\'action est « placer-seul »', () => {
    const indice = logique.indice(logique.etatInitial(donnees), donnees, { retraitAutoNotes: false });
    assert.equal(indice?.action.type, 'placer-seul');
  });

  test('aucun indice sur une grille terminée', () => {
    const fini: EtatSudoku = { valeurs: SOLUTION_UNIQUE, notes: SOLUTION_UNIQUE.map(() => []) };
    assert.equal(logique.indice(fini, donnees, AVEC_RETRAIT), null);
  });

  test('éliminations : notes des cases concernées = leurs candidats moins ceux retirés, solution conservée', () => {
    const d = grilleExpert();
    const { etat, indice } = jusquAElimination(d);
    assert.ok(indice.action.type === 'definir-notes');
    assert.equal(indice.marques.placements.length, 0);
    assert.ok(indice.marques.eliminations.length > 0);
    assert.match(indice.libelleAction, /^Retirer \d+ candidats?$/);
    const retirees = new Map(indice.marques.eliminations.map((e) => [e.cellule, e.valeurs]));
    for (const { cellule, notes } of indice.action.changements) {
      for (const v of retirees.get(cellule) ?? []) assert.ok(!notes.includes(v), `${v} retiré de la case ${cellule}`);
      assert.ok(notes.includes(d.solution[cellule] ?? 0), 'le bon chiffre reste parmi les notes');
    }
    // Appliquer l'indice fait avancer : l'indice suivant n'est pas le même
    const apres = logique.appliquer(etat, indice.action, d);
    assert.notDeepEqual(apres, etat);
    assert.notDeepEqual(logique.indice(apres, d, AVEC_RETRAIT)?.action, indice.action);
  });

  test('notes fiables du joueur : prises en compte ; notes sans le bon chiffre : ignorées', () => {
    const cible = vides[0] ?? 0;
    const bonne = SOLUTION_UNIQUE[cible] ?? 1;
    const calcules = etatPourIndice(logique.etatInitial(donnees), donnees).candidats[cible] ?? 0;
    assert.ok(valeursDuMasque(calcules).length > 1, 'la case doit avoir plusieurs candidats');

    const avecNote = (notes: readonly number[]): EtatSudoku => {
      const initial = logique.etatInitial(donnees);
      return { ...initial, notes: initial.notes.map((n, i) => (i === cible ? notes : n)) };
    };
    // Seulement le bon chiffre : fiable → la case n'a plus que ce candidat
    assert.equal(etatPourIndice(avecNote([bonne]), donnees).candidats[cible], masqueComplet([bonne]));
    // Un mauvais chiffre seulement : notes ignorées → candidats calculés
    const autre = valeursDuMasque(calcules).find((v) => v !== bonne) ?? 0;
    assert.equal(etatPourIndice(avecNote([autre]), donnees).candidats[cible], calcules);
  });

  test('jouer tous les indices termine une grille Expert, sans muter l\'état', () => {
    const d = grilleExpert();
    let etat = logique.etatInitial(d);
    let coups = 0;
    for (; coups < 500 && !logique.estTerminee(etat, d); coups++) {
      const indice = logique.indice(etat, d, AVEC_RETRAIT);
      assert.ok(indice !== null);
      const suivant = logique.appliquer(etat, indice.action, d);
      assert.notEqual(suivant, etat, 'chaque indice a un effet');
      etat = suivant;
    }
    assert.ok(logique.estTerminee(etat, d));
  });
});
