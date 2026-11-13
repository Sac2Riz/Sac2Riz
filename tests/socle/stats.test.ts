// Tests des statistiques (code pur) et du service des parties (avec le stockage en mémoire) :
// les abandons sont comptés à part et ne touchent jamais aux temps.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { creerServiceParties } from '../../src/socle/service-parties.ts';
import {
  enregistrerAbandon,
  enregistrerTerminee,
  estNouveauRecord,
  forceMoyenne,
  lignesStats,
  statsVides,
  tempsMoyenMs,
} from '../../src/socle/stats.ts';
import { creerStockageMemoire } from '../../src/socle/stockage/memoire.ts';
import type { PartieSauvegardee } from '../../src/types/sauvegarde.ts';
import { estStatsJeu } from '../../src/utils/gardes-sauvegarde.ts';
import { puzzleFactice } from './aide.ts';

describe('statistiques (pur)', () => {
  test('stats vides valides', () => {
    assert.ok(estStatsJeu(statsVides()));
  });

  test('parties terminées : meilleur temps, totaux, moyenne', () => {
    let stats = enregistrerTerminee(statsVides(), 'moyen', 300_000, 5, 0);
    stats = enregistrerTerminee(stats, 'moyen', 200_000, 6, 0);
    stats = enregistrerTerminee(stats, 'moyen', 400_000, 5, 0);
    assert.deepEqual(stats.moyen, { terminees: 3, abandonnees: 0, meilleurTempsMs: 200_000, totalTempsMs: 900_000, totalForce: 16 });
    assert.equal(tempsMoyenMs(stats.moyen), 300_000);
    assert.deepEqual(stats.facile, statsVides().facile, 'les autres niveaux ne bougent pas');
  });

  test('abandons : compteur séparé, temps inchangés', () => {
    const avant = enregistrerTerminee(statsVides(), 'expert', 600_000, 9, 0);
    const apres = enregistrerAbandon(enregistrerAbandon(avant, 'expert'), 'expert');
    assert.equal(apres.expert.abandonnees, 2);
    assert.equal(apres.expert.terminees, 1);
    assert.equal(apres.expert.meilleurTempsMs, 600_000);
    assert.equal(tempsMoyenMs(apres.expert), 600_000);
    assert.equal(tempsMoyenMs(statsVides().expert), null);
  });

  test('partie avec indices : comptée (terminées, moyennes) mais jamais record', () => {
    let stats = enregistrerTerminee(statsVides(), 'facile', 300_000, 3, 0);
    stats = enregistrerTerminee(stats, 'facile', 100_000, 4, 2);
    assert.equal(stats.facile.terminees, 2);
    assert.equal(stats.facile.meilleurTempsMs, 300_000, 'le temps avec indices ne bat pas le record');
    assert.equal(tempsMoyenMs(stats.facile), 200_000);
    assert.equal(forceMoyenne(stats.facile), 3.5);
    // Première partie du niveau, avec indices : toujours pas de record
    const seule = enregistrerTerminee(statsVides(), 'moyen', 100_000, 5, 1);
    assert.equal(seule.moyen.meilleurTempsMs, null);
    assert.equal(seule.moyen.terminees, 1);
  });

  test('estNouveauRecord', () => {
    const vide = statsVides().moyen;
    assert.equal(estNouveauRecord(vide, 500_000, 0), true, 'premier temps');
    assert.equal(estNouveauRecord(vide, 500_000, 1), false, 'avec indice');
    const avec = { ...vide, terminees: 1, meilleurTempsMs: 200_000 };
    assert.equal(estNouveauRecord(avec, 199_000, 0), true);
    assert.equal(estNouveauRecord(avec, 200_000, 0), false, "égaler n'est pas battre");
  });

  test('lignes du tableau : « — » sans partie terminée, temps et force formatés', () => {
    let stats = enregistrerTerminee(statsVides(), 'moyen', 125_000, 5, 0);
    stats = enregistrerTerminee(stats, 'moyen', 135_000, 6, 0);
    stats = enregistrerAbandon(stats, 'facile');
    const [facile, moyen] = lignesStats(stats, ['facile', 'moyen']);
    assert.deepEqual(facile, {
      niveau: 'Facile',
      terminees: '0',
      abandonnees: '1',
      meilleurTemps: '—',
      tempsMoyen: '—',
      forceMoyenne: '—',
    });
    assert.deepEqual(moyen, {
      niveau: 'Moyen',
      terminees: '2',
      abandonnees: '0',
      meilleurTemps: '2:05',
      tempsMoyen: '2:10',
      forceMoyenne: '5,5',
    });
  });
});

function partieDe(jeu: string): PartieSauvegardee {
  return {
    jeu,
    versionFormat: 1,
    puzzle: puzzleFactice(jeu, 'difficile'),
    actions: [],
    curseur: 0,
    chronoMs: 12_000,
    indicesUtilises: 0,
    debut: '2026-11-13T10:00:00.000Z',
    maj: '2026-11-13T10:00:12.000Z',
  };
}

describe('service des parties', () => {
  test('sauvegarder puis lire', async () => {
    const parties = creerServiceParties(creerStockageMemoire());
    assert.equal(await parties.lire('jeu-a'), null);
    await parties.sauvegarder(partieDe('jeu-a'));
    assert.equal((await parties.lire('jeu-a'))?.chronoMs, 12_000);
  });

  test('abandonner : +1 abandon au niveau de la partie remplacée, partie supprimée', async () => {
    const parties = creerServiceParties(creerStockageMemoire());
    await parties.sauvegarder(partieDe('jeu-a'));
    await parties.abandonner('jeu-a');
    assert.equal(await parties.lire('jeu-a'), null);
    const stats = await parties.stats('jeu-a');
    assert.equal(stats.difficile.abandonnees, 1);
    assert.equal(stats.difficile.terminees, 0);
    assert.equal(stats.difficile.meilleurTempsMs, null);
    await parties.abandonner('jeu-a'); // plus de partie : rien ne change
    assert.equal((await parties.stats('jeu-a')).difficile.abandonnees, 1);
  });

  test('terminer : statistiques mises à jour et partie supprimée, même après une sauvegarde en vol', async () => {
    const parties = creerServiceParties(creerStockageMemoire());
    // Lancées sans attendre, dans cet ordre : la sauvegarde ne doit pas « ressusciter » la partie
    const sauvegarde = parties.sauvegarder(partieDe('jeu-a'));
    const fin = parties.terminer({ jeu: 'jeu-a', niveau: 'difficile', tempsMs: 95_000, force: 7, indicesUtilises: 0 });
    const [, bilan] = await Promise.all([sauvegarde, fin]);
    assert.deepEqual(bilan, { nouveauRecord: true, ancienRecordMs: null });
    assert.equal(await parties.lire('jeu-a'), null);
    const stats = await parties.stats('jeu-a');
    assert.equal(stats.difficile.terminees, 1);
    assert.equal(stats.difficile.meilleurTempsMs, 95_000);
    assert.equal(stats.difficile.totalForce, 7);
  });

  test('terminer : record battu ou non, ancien record renvoyé ; jamais de record avec indices', async () => {
    const parties = creerServiceParties(creerStockageMemoire());
    const fin = (tempsMs: number, indicesUtilises: number): ReturnType<typeof parties.terminer> =>
      parties.terminer({ jeu: 'jeu-a', niveau: 'moyen', tempsMs, force: 5, indicesUtilises });
    assert.deepEqual(await fin(300_000, 0), { nouveauRecord: true, ancienRecordMs: null });
    assert.deepEqual(await fin(400_000, 0), { nouveauRecord: false, ancienRecordMs: 300_000 });
    assert.deepEqual(await fin(100_000, 3), { nouveauRecord: false, ancienRecordMs: 300_000 });
    assert.deepEqual(await fin(200_000, 0), { nouveauRecord: true, ancienRecordMs: 300_000 });
    const stats = await parties.stats('jeu-a');
    assert.equal(stats.moyen.terminees, 4);
    assert.equal(stats.moyen.meilleurTempsMs, 200_000);
  });

  test('les jeux sont indépendants', async () => {
    const parties = creerServiceParties(creerStockageMemoire());
    await parties.sauvegarder(partieDe('jeu-a'));
    await parties.sauvegarder(partieDe('jeu-b'));
    await parties.abandonner('jeu-a');
    assert.ok((await parties.lire('jeu-b')) !== null);
    assert.equal((await parties.stats('jeu-b')).difficile.abandonnees, 0);
  });
});
