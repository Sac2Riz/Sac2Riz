// Tests de conformité du stockage, lancés sur l'implémentation en mémoire.
// (La version IndexedDB respecte la même interface ; elle se teste dans le navigateur.)
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { creerStockageMemoire } from '../../src/socle/stockage/memoire.ts';
import { VERSION_SCHEMA } from '../../src/socle/stockage/schema.ts';
import { CLE_REGLAGES, cleJeuNiveau, NOMS_MAGASINS, prefixeReserve } from '../../src/socle/stockage/stockage.ts';
import { NIVEAUX } from '../../src/types/niveaux.ts';
import { REGLAGES_PAR_DEFAUT, type EntreeReserve, type StatsJeu } from '../../src/types/sauvegarde.ts';
import { estStatsJeu } from '../../src/utils/gardes-sauvegarde.ts';
import { puzzleFactice } from './aide.ts';

function entree(jeu: string, niveau: 'moyen' | 'expert'): EntreeReserve {
  return { jeu, niveau, ajouteLe: '2026-11-13T10:00:00.000Z', puzzle: puzzleFactice(jeu, niveau) };
}

function creerStatsVides(): StatsJeu {
  const stats = Object.fromEntries(
    NIVEAUX.map((n) => [n, { terminees: 0, meilleurTempsMs: null, totalTempsMs: 0, totalForce: 0 }]),
  );
  // fromEntries perd le type exact des clés : la garde le retrouve
  if (!estStatsJeu(stats)) throw new Error('statistiques de test invalides');
  return stats;
}
const statsVides = creerStatsVides();

describe('stockage en mémoire', () => {
  test('schéma : version actuelle et tous les magasins créés', () => {
    const s = creerStockageMemoire();
    assert.equal(s.version, VERSION_SCHEMA);
    assert.deepEqual([...s.brut.keys()].sort(), [...NOMS_MAGASINS].sort());
  });

  test('lire / écrire / supprimer', async () => {
    const s = creerStockageMemoire();
    assert.equal(await s.lire('reglages', CLE_REGLAGES), null);
    await s.ecrire('reglages', CLE_REGLAGES, REGLAGES_PAR_DEFAUT);
    assert.deepEqual(await s.lire('reglages', CLE_REGLAGES), REGLAGES_PAR_DEFAUT);
    await s.ecrire('stats', 'jeu-a', statsVides);
    assert.deepEqual(await s.lire('stats', 'jeu-a'), statsVides);
    await s.supprimer('reglages', CLE_REGLAGES);
    assert.equal(await s.lire('reglages', CLE_REGLAGES), null);
  });

  test('les valeurs sont copiées (comme IndexedDB)', async () => {
    const s = creerStockageMemoire();
    const reglages = { theme: 'clair' as const, verifierErreurs: true };
    await s.ecrire('reglages', CLE_REGLAGES, reglages);
    const lu = await s.lire('reglages', CLE_REGLAGES);
    assert.notEqual(lu, reglages);
    assert.notEqual(await s.lire('reglages', CLE_REGLAGES), lu);
  });

  test('une donnée invalide est ignorée à la lecture', async () => {
    const s = creerStockageMemoire();
    s.brut.get('reglages')?.set(CLE_REGLAGES, { theme: 'violet', verifierErreurs: 1 });
    assert.equal(await s.lire('reglages', CLE_REGLAGES), null);
  });

  test('lister et compter : préfixe, ordre des clés, entrées invalides ignorées', async () => {
    const s = creerStockageMemoire();
    const p = prefixeReserve('jeu-a', 'moyen');
    await s.ecrire('reserve', `${p}3`, entree('jeu-a', 'moyen'));
    await s.ecrire('reserve', `${p}1`, entree('jeu-a', 'moyen'));
    await s.ecrire('reserve', `${prefixeReserve('jeu-a', 'expert')}2`, entree('jeu-a', 'expert'));
    await s.ecrire('reserve', `${prefixeReserve('jeu-ab', 'moyen')}0`, entree('jeu-ab', 'moyen'));
    s.brut.get('reserve')?.set(`${p}2`, { abime: true });
    const liste = await s.lister('reserve', p);
    assert.deepEqual(
      liste.map((e) => e.cle),
      [`${p}1`, `${p}3`],
    );
    assert.equal(await s.compter('reserve', p), 2);
    assert.equal(await s.compter('reserve', 'jeu-a/'), 3);
    assert.equal(await s.compter('reserve', ''), 4);
  });

  test('prendrePremier : plus petite clé, retirée ; invalides supprimées en chemin', async () => {
    const s = creerStockageMemoire();
    const p = prefixeReserve('jeu-a', 'moyen');
    s.brut.get('reserve')?.set(`${p}0`, 'abîmé');
    await s.ecrire('reserve', `${p}2`, entree('jeu-a', 'moyen'));
    await s.ecrire('reserve', `${p}1`, entree('jeu-a', 'moyen'));
    const premiere = await s.prendrePremier('reserve', p);
    assert.equal(premiere?.cle, `${p}1`);
    assert.equal(s.brut.get('reserve')?.has(`${p}0`), false, 'entrée invalide supprimée');
    assert.equal((await s.prendrePremier('reserve', p))?.cle, `${p}2`);
    assert.equal(await s.prendrePremier('reserve', p), null);
  });

  test('prendrePremier est atomique : des appels simultanés ne reçoivent jamais la même entrée', async () => {
    const s = creerStockageMemoire();
    const p = prefixeReserve('jeu-a', 'moyen');
    for (let i = 0; i < 3; i++) await s.ecrire('reserve', `${p}${i}`, entree('jeu-a', 'moyen'));
    const resultats = await Promise.all(Array.from({ length: 10 }, () => s.prendrePremier('reserve', p)));
    const obtenues = resultats.filter((r) => r !== null).map((r) => r.cle);
    assert.equal(obtenues.length, 3);
    assert.equal(new Set(obtenues).size, 3);
  });

  test('clés : cleJeuNiveau et préfixe de réserve', () => {
    assert.equal(cleJeuNiveau('sudoku-classique', 'expert'), 'sudoku-classique/expert');
    assert.equal(prefixeReserve('sudoku-classique', 'expert'), 'sudoku-classique/expert/');
  });

  test('après fermer(), toute opération échoue', async () => {
    const s = creerStockageMemoire();
    s.fermer();
    await assert.rejects(s.lire('reglages', CLE_REGLAGES));
  });
});
