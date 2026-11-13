// Tests des gardes de type des données conservées.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Json } from '../../src/types/json.ts';
import { NIVEAUX } from '../../src/types/niveaux.ts';
import { REGLAGES_PAR_DEFAUT, type EntreeReserve, type EtatPack, type PartieSauvegardee } from '../../src/types/sauvegarde.ts';
import { estJson } from '../../src/utils/gardes-json.ts';
import {
  estDateIso,
  estEntreeReserve,
  estEtatPack,
  estNotation,
  estPartieSauvegardee,
  estPuzzle,
  estReglages,
  estStatsJeu,
} from '../../src/utils/gardes-sauvegarde.ts';
import { puzzleFactice } from '../socle/aide.ts';

/** Copie de l'objet avec un champ remplacé (valeur quelconque, pour fabriquer des intrus). */
function avec(objet: object, champ: string, valeur: unknown): unknown {
  return { ...objet, [champ]: valeur };
}

describe('gardes des données conservées', () => {
  test('estJson', () => {
    assert.ok(estJson({ a: [1, 'b', null, true, { c: 2 }] }));
    assert.equal(estJson(undefined), false);
    assert.equal(estJson(Number.NaN), false);
    assert.equal(estJson({ a: () => 1 }), false);
    assert.equal(estJson(new Date()), false);
    assert.equal(estJson([1, undefined]), false);
  });

  test('estDateIso', () => {
    assert.ok(estDateIso('2026-11-13T10:00:00.000Z'));
    assert.equal(estDateIso('pas une date'), false);
    assert.equal(estDateIso(''), false);
  });

  test('estNotation et estPuzzle', () => {
    const p = puzzleFactice('jeu-a', 'moyen');
    assert.ok(estNotation(p.notation));
    assert.ok(estPuzzle(p));
    assert.equal(estNotation(avec(p.notation, 'force', 11)), false);
    assert.equal(estNotation(avec(p.notation, 'niveau', 'impossible')), false);
    assert.equal(estNotation(avec(p.notation, 'details', { x: -1 })), false);
    assert.equal(estPuzzle(avec(p, 'graine', -1)), false);
    assert.equal(estPuzzle(avec(p, 'jeu', '')), false);
    assert.equal(estPuzzle(avec(p, 'donnees', undefined)), false);
  });

  test('estPartieSauvegardee', () => {
    const partie: PartieSauvegardee = {
      jeu: 'jeu-a',
      versionFormat: 1,
      puzzle: puzzleFactice('jeu-a', 'facile'),
      actions: [{ a: 1 }, { a: 2 }],
      curseur: 1,
      chronoMs: 1234.5,
      indicesUtilises: 0,
      debut: '2026-11-13T10:00:00.000Z',
      maj: '2026-11-13T10:05:00.000Z',
    };
    assert.ok(estPartieSauvegardee(partie));
    assert.equal(estPartieSauvegardee(avec(partie, 'curseur', 3)), false, 'curseur au-delà des actions');
    assert.equal(estPartieSauvegardee(avec(partie, 'jeu', 'jeu-b')), false, 'puzzle d\'un autre jeu');
    assert.equal(estPartieSauvegardee(avec(partie, 'chronoMs', -1)), false);
    assert.equal(estPartieSauvegardee(avec(partie, 'maj', 'hier')), false);
    assert.equal(estPartieSauvegardee(avec(partie, 'versionFormat', 0)), false);
  });

  test('estStatsJeu : exactement les 6 niveaux', () => {
    const niveau: Json = { terminees: 2, meilleurTempsMs: 60000, totalTempsMs: 150000, totalForce: 9 };
    const stats = Object.fromEntries(NIVEAUX.map((n) => [n, niveau]));
    assert.ok(estStatsJeu(stats));
    assert.equal(estStatsJeu(avec(stats, 'bonus', niveau)), false);
    const { expert: _, ...sansExpert } = stats;
    assert.equal(estStatsJeu(sansExpert), false);
    assert.equal(estStatsJeu(avec(stats, 'moyen', { ...niveau, terminees: 1.5 })), false);
    assert.ok(estStatsJeu(avec(stats, 'moyen', { ...niveau, meilleurTempsMs: null })));
  });

  test('estReglages', () => {
    assert.ok(estReglages(REGLAGES_PAR_DEFAUT));
    assert.equal(estReglages(avec(REGLAGES_PAR_DEFAUT, 'theme', 'violet')), false);
    assert.equal(estReglages(avec(REGLAGES_PAR_DEFAUT, 'verifierErreurs', 'oui')), false);
  });

  test('estEntreeReserve : le puzzle doit être du jeu et du niveau annoncés', () => {
    const e: EntreeReserve = {
      jeu: 'jeu-a',
      niveau: 'expert',
      ajouteLe: '2026-11-13T10:00:00.000Z',
      puzzle: puzzleFactice('jeu-a', 'expert'),
    };
    assert.ok(estEntreeReserve(e));
    assert.equal(estEntreeReserve(avec(e, 'niveau', 'moyen')), false);
    assert.equal(estEntreeReserve(avec(e, 'jeu', 'jeu-b')), false);
  });

  test('estEtatPack : ordre = permutation, position et dernière dans les bornes', () => {
    const etat: EtatPack = { taille: 4, ordre: [2, 0, 3, 1], position: 4, derniere: 1, cycle: 2 };
    assert.ok(estEtatPack(etat));
    assert.equal(estEtatPack(avec(etat, 'ordre', [2, 0, 3, 3])), false);
    assert.equal(estEtatPack(avec(etat, 'ordre', [2, 0, 3])), false);
    assert.equal(estEtatPack(avec(etat, 'position', 5)), false);
    assert.equal(estEtatPack(avec(etat, 'derniere', 4)), false);
    assert.equal(estEtatPack(avec(etat, 'cycle', 0)), false);
    assert.ok(estEtatPack(avec(etat, 'derniere', null)));
  });
});
