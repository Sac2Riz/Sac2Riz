// Tests des statistiques (code pur) et du service des parties (avec le stockage en mémoire) :
// les abandons sont comptés à part et ne touchent jamais aux temps.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { creerServiceParties } from '../../src/socle/service-parties.ts';
import { enregistrerAbandon, enregistrerTerminee, statsVides, tempsMoyenMs } from '../../src/socle/stats.ts';
import { creerStockageMemoire } from '../../src/socle/stockage/memoire.ts';
import type { PartieSauvegardee } from '../../src/types/sauvegarde.ts';
import { estStatsJeu } from '../../src/utils/gardes-sauvegarde.ts';
import { puzzleFactice } from './aide.ts';

describe('statistiques (pur)', () => {
  test('stats vides valides', () => {
    assert.ok(estStatsJeu(statsVides()));
  });

  test('parties terminées : meilleur temps, totaux, moyenne', () => {
    let stats = enregistrerTerminee(statsVides(), 'moyen', 300_000, 5);
    stats = enregistrerTerminee(stats, 'moyen', 200_000, 6);
    stats = enregistrerTerminee(stats, 'moyen', 400_000, 5);
    assert.deepEqual(stats.moyen, { terminees: 3, abandonnees: 0, meilleurTempsMs: 200_000, totalTempsMs: 900_000, totalForce: 16 });
    assert.equal(tempsMoyenMs(stats.moyen), 300_000);
    assert.deepEqual(stats.facile, statsVides().facile, 'les autres niveaux ne bougent pas');
  });

  test('abandons : compteur séparé, temps inchangés', () => {
    const avant = enregistrerTerminee(statsVides(), 'expert', 600_000, 9);
    const apres = enregistrerAbandon(enregistrerAbandon(avant, 'expert'), 'expert');
    assert.equal(apres.expert.abandonnees, 2);
    assert.equal(apres.expert.terminees, 1);
    assert.equal(apres.expert.meilleurTempsMs, 600_000);
    assert.equal(tempsMoyenMs(apres.expert), 600_000);
    assert.equal(tempsMoyenMs(statsVides().expert), null);
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
    const fin = parties.terminer('jeu-a', 'difficile', 95_000, 7);
    await Promise.all([sauvegarde, fin]);
    assert.equal(await parties.lire('jeu-a'), null);
    const stats = await parties.stats('jeu-a');
    assert.equal(stats.difficile.terminees, 1);
    assert.equal(stats.difficile.meilleurTempsMs, 95_000);
    assert.equal(stats.difficile.totalForce, 7);
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
