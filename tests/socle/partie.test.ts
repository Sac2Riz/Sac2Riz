// Tests de la partie en cours (socle/partie.ts) avec le jeu modèle : jouer, annuler, rétablir,
// actions sans effet, fin de partie, chrono, aller-retour par la sauvegarde.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { logique as logiqueModele } from '../../src/games/_modele/logique.ts';
import {
  annuler,
  changerPause,
  changerVisibilitePartie,
  compterIndice,
  depuisSauvegarde,
  jouer,
  nouvellePartie,
  peutAnnulerPartie,
  peutRetablirPartie,
  retablir,
  tempsMs,
  versSauvegarde,
  type Logique,
  type Partie,
} from '../../src/socle/partie.ts';
import type { Puzzle } from '../../src/types/jeu.ts';
import type { Json } from '../../src/types/json.ts';

// Le modèle vu comme une logique quelconque (comme le fait le socle)
const logique: Logique = logiqueModele;
const T0 = 1_000_000;
const DATE = '2026-11-13T10:00:00.000Z';
const puzzle: Puzzle<Json> = {
  jeu: '_modele',
  graine: 1,
  notation: { niveau: 'moyen', force: 5, techniqueMax: 'modele-deduction', details: { casesVides: 2 } },
  donnees: { donnes: [1, 2, 3, 4, 0, 0], solution: [1, 2, 3, 4, 5, 6] },
};
const placer = (cellule: number, valeur: number): Json => ({ type: 'placer', cellule, valeur });

function debut(): Partie {
  return nouvellePartie(logique, puzzle, T0, DATE, true);
}

describe('partie : jouer, annuler, rétablir', () => {
  test('jouer enregistre l\'action et change l\'état', () => {
    const p = jouer(logique, debut(), placer(4, 5), T0 + 10);
    assert.deepEqual(p.historique, { actions: [placer(4, 5)], curseur: 1 });
    assert.ok(peutAnnulerPartie(p));
    assert.equal(peutRetablirPartie(p), false);
  });

  test('une action sans effet n\'est pas enregistrée', () => {
    const p0 = debut();
    assert.equal(jouer(logique, p0, placer(0, 9), T0), p0, 'case donnée');
    const p1 = jouer(logique, p0, placer(4, 5), T0);
    assert.equal(jouer(logique, p1, placer(4, 5), T0), p1, 'même chiffre posé deux fois');
  });

  test('annuler puis rétablir retrouvent les états ; jouer après annuler oublie la suite', () => {
    const p1 = jouer(logique, debut(), placer(4, 3), T0);
    const p2 = jouer(logique, p1, placer(4, 5), T0);
    const a = annuler(logique, p2);
    assert.deepEqual(a.etat, p1.etat);
    assert.deepEqual(retablir(logique, a).etat, p2.etat);
    const b = jouer(logique, a, { type: 'effacer', cellule: 4 }, T0);
    assert.equal(b.historique.actions.length, 2);
    assert.equal(peutRetablirPartie(b), false);
  });

  test('fin de partie : chrono figé, plus d\'action ni d\'annulation', () => {
    let p = jouer(logique, debut(), placer(4, 5), T0 + 1000);
    assert.equal(p.terminee, false);
    p = jouer(logique, p, placer(5, 6), T0 + 5000);
    assert.equal(p.terminee, true);
    assert.equal(tempsMs(p, T0 + 99_000), 5000);
    assert.equal(peutAnnulerPartie(p), false);
    assert.equal(annuler(logique, p), p);
    assert.equal(jouer(logique, p, { type: 'effacer', cellule: 5 }, T0), p);
  });

  test('compteur d\'indices : +1 par indice montré, sauvegardé, figé en fin de partie', () => {
    let p = compterIndice(compterIndice(debut()));
    assert.equal(p.indicesUtilises, 2);
    assert.equal(p.historique.actions.length, 0, 'montrer un indice ne joue aucun coup');
    const reprise = depuisSauvegarde(logique, versSauvegarde(logique, p, T0, DATE), T0, true);
    assert.equal(reprise?.indicesUtilises, 2);
    p = jouer(logique, jouer(logique, p, placer(4, 5), T0), placer(5, 6), T0);
    assert.equal(compterIndice(p), p, 'partie terminée : plus d\'indice');
  });
});

describe('partie : chrono', () => {
  test('pause manuelle et arrière-plan arrêtent le temps', () => {
    let p = debut();
    p = changerPause(p, true, T0 + 1000);
    assert.equal(tempsMs(p, T0 + 9000), 1000);
    p = changerPause(p, false, T0 + 9000);
    p = changerVisibilitePartie(p, false, T0 + 10_000);
    assert.equal(tempsMs(p, T0 + 60_000), 2000);
    p = changerVisibilitePartie(p, true, T0 + 60_000);
    assert.equal(tempsMs(p, T0 + 61_000), 3000);
  });
});

describe('partie : sauvegarde et reprise', () => {
  test('aller-retour : même historique, même état, temps conservé', () => {
    const p1 = jouer(logique, debut(), placer(4, 3), T0);
    const p2 = annuler(logique, jouer(logique, p1, placer(5, 6), T0));
    const sauvegarde = versSauvegarde(logique, p2, T0 + 42_000, DATE);
    assert.equal(sauvegarde.chronoMs, 42_000);
    assert.equal(sauvegarde.curseur, 1);
    const reprise = depuisSauvegarde(logique, structuredClone(sauvegarde), T0 + 500_000, true);
    assert.ok(reprise !== null);
    assert.deepEqual(reprise.etat, p2.etat);
    assert.deepEqual(reprise.historique, p2.historique);
    assert.ok(peutRetablirPartie(reprise), 'l\'action annulée reste rétablissable');
    assert.equal(tempsMs(reprise, T0 + 501_000), 43_000);
  });

  test('reprise refusée si la sauvegarde est incohérente', () => {
    const sauvegarde = versSauvegarde(logique, jouer(logique, debut(), placer(4, 3), T0), T0, DATE);
    const refus = (modif: object): void =>
      assert.equal(depuisSauvegarde(logique, { ...sauvegarde, ...modif }, T0, true), null, JSON.stringify(modif));
    refus({ jeu: 'autre-jeu' });
    refus({ versionFormat: 99 });
    refus({ curseur: 5 });
    refus({ actions: [{ type: 'exploser', cellule: 0 }] });
    refus({ puzzle: { ...puzzle, donnees: { donnes: [1], solution: [1] } } });
  });

  test('une sauvegarde déjà gagnante est reprise comme terminée', () => {
    const p = jouer(logique, jouer(logique, debut(), placer(4, 5), T0), placer(5, 6), T0 + 3000);
    const reprise = depuisSauvegarde(logique, versSauvegarde(logique, p, T0 + 3000, DATE), T0 + 10_000, true);
    assert.ok(reprise !== null);
    assert.equal(reprise.terminee, true);
    assert.equal(tempsMs(reprise, T0 + 20_000), 3000);
  });
});
