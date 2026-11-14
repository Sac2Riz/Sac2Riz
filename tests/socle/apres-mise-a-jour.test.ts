// Tests de la fenêtre « Sac2Riz a été mis à jour » : quand l'afficher, avec quelles nouveautés,
// et la mémoire des nouveautés vues dans le stockage (magasin « appli »).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { decisionApresMiseAJour, marquerVues } from '../../src/socle/pwa/apres-mise-a-jour.ts';
import { creerStockageMemoire } from '../../src/socle/stockage/memoire.ts';
import { CLE_NOUVEAUTES_VUES } from '../../src/socle/stockage/stockage.ts';
import { estNouveautesVues, type FichierNouveautes, type GroupeNouveautes } from '../../src/types/nouveautes.ts';

const groupe = (id: string): GroupeNouveautes => ({ id, date: '2026-11-14', titre: id, nouveautes: [`n-${id}`] });
/** Fichier de nouveautés (du plus récent au plus ancien). */
const fichier = (...ids: string[]): FichierNouveautes => ({ versions: ids.map(groupe) });
const ids = (groupes: readonly GroupeNouveautes[]): string[] => groupes.map((g) => g.id);

describe('fenêtre « Sac2Riz a été mis à jour »', () => {
  test('tout premier lancement (base neuve) : rien à montrer, tout est noté comme vu', () => {
    const d = decisionApresMiseAJour(fichier('b', 'a'), null, true);
    assert.deepEqual(d.montrer, []);
    assert.deepEqual(d.enregistrer, { vues: ['b', 'a'] });
  });

  test('une fois par version : les nouveautés montrées ne le sont plus au lancement suivant', () => {
    const premier = decisionApresMiseAJour(fichier('c', 'b', 'a'), { vues: ['a'] }, false);
    assert.deepEqual(ids(premier.montrer), ['c', 'b']);
    assert.ok(premier.enregistrer !== null);
    const second = decisionApresMiseAJour(fichier('c', 'b', 'a'), premier.enregistrer, false);
    assert.deepEqual(second, { montrer: [], enregistrer: null });
  });

  test('aucune nouveauté visible depuis la dernière vue (correction interne) : pas de fenêtre', () => {
    assert.deepEqual(decisionApresMiseAJour(fichier('b', 'a'), { vues: ['a', 'b'] }, false), { montrer: [], enregistrer: null });
  });

  test('plusieurs versions publiées depuis la dernière vue : toutes, de la plus récente à la plus ancienne', () => {
    const d = decisionApresMiseAJour(fichier('e', 'd', 'c', 'b', 'a'), { vues: ['b', 'a'] }, false);
    assert.deepEqual(ids(d.montrer), ['e', 'd', 'c']);
  });

  test('mise à jour depuis une version sans cette fonction (base existante, rien de noté) : tout est montré', () => {
    const d = decisionApresMiseAJour(fichier('b', 'a'), null, false);
    assert.deepEqual(ids(d.montrer), ['b', 'a']);
    assert.deepEqual(d.enregistrer, { vues: ['b', 'a'] });
  });

  test('pas de fichier de nouveautés (développement) : rien', () => {
    assert.deepEqual(decisionApresMiseAJour(null, null, false), { montrer: [], enregistrer: null });
  });

  test('mise à jour par le bouton : les nouveautés de sa fenêtre sont notées avant le redémarrage, rien à remontrer', () => {
    const vues = marquerVues({ vues: ['a'] }, [groupe('c'), groupe('b')]);
    assert.deepEqual(vues, { vues: ['a', 'c', 'b'] });
    assert.deepEqual(marquerVues(vues, [groupe('c')]), vues, 'sans doublon');
    assert.deepEqual(decisionApresMiseAJour(fichier('c', 'b', 'a'), vues, false).montrer, []);
  });
});

describe('mémoire des nouveautés vues (magasin « appli »)', () => {
  test('écrite puis relue ; une valeur abîmée est ignorée', async () => {
    const s = creerStockageMemoire(false);
    assert.equal(s.baseNeuve, false);
    assert.equal(await s.lire('appli', CLE_NOUVEAUTES_VUES), null);
    await s.ecrire('appli', CLE_NOUVEAUTES_VUES, { vues: ['a'] });
    assert.deepEqual(await s.lire('appli', CLE_NOUVEAUTES_VUES), { vues: ['a'] });
    s.brut.get('appli')?.set(CLE_NOUVEAUTES_VUES, { vues: [1] });
    assert.equal(await s.lire('appli', CLE_NOUVEAUTES_VUES), null);
    assert.equal(estNouveautesVues({ vues: [] }), true);
    assert.equal(estNouveautesVues([]), false);
  });

  test('un import ne remplace pas les nouveautés vues', async () => {
    const s = creerStockageMemoire();
    assert.equal(s.baseNeuve, true);
    await s.ecrire('appli', CLE_NOUVEAUTES_VUES, { vues: ['a'] });
    await s.remplacerDonnees({
      reglages: { theme: 'systeme', verifierErreurs: false, miseEnEvidence: true, jeux: {} },
      parties: [],
      stats: {},
      packsJoues: {},
    });
    assert.deepEqual(await s.lire('appli', CLE_NOUVEAUTES_VUES), { vues: ['a'] });
  });
});
