// Tests du client du worker, avec un faux worker (fabriqueFactice) et une horloge factice.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { creerClientWorker, type FabriqueCanal } from '../../src/socle/client-worker.ts';
import { logique as logiqueModele } from '../../src/games/_modele/logique.ts';
import type { DemandeWorker } from '../../src/types/worker.ts';
import { traiterGeneration } from '../../src/worker/traitement.ts';
import { fabriqueFactice, HorlogeFactice, laisserFiler, puzzleFactice, type FauxCanal } from './aide.ts';

function preparer(budgetMs = 1000, margeMs = 500) {
  const horloge = new HorlogeFactice();
  const { fabrique, canaux } = fabriqueFactice();
  let graine = 100;
  const client = creerClientWorker({
    fabrique,
    programmer: horloge.programmer,
    tirerGraine: () => graine++,
    budgetMs,
    margeMs,
  });
  return { horloge, canaux, client };
}

/** Dernière demande de génération envoyée sur un canal. */
function derniereGeneration(canal: FauxCanal | undefined): Extract<DemandeWorker, { type: 'generer' }> {
  const demande = canal?.envoyes.at(-1);
  assert.ok(demande !== undefined && demande.type === 'generer', 'une demande de génération doit être envoyée');
  return demande;
}

describe('client du worker', () => {
  test('génération réussie : demande complète envoyée, puzzle renvoyé', async () => {
    const { canaux, client } = preparer();
    const d = client.generer('jeu-a', 'moyen', 'fond', null);
    const envoi = derniereGeneration(canaux[0]);
    assert.deepEqual(
      { jeu: envoi.jeu, niveau: envoi.niveau, graine: envoi.graine, budgetMs: envoi.budgetMs },
      { jeu: 'jeu-a', niveau: 'moyen', graine: 100, budgetMs: 1000 },
    );
    const puzzle = puzzleFactice('jeu-a', 'moyen');
    canaux[0]?.recepteurs.message({ type: 'genere', requete: envoi.requete, puzzle });
    assert.deepEqual(await d.resultat, { statut: 'ok', puzzle });
  });

  test('préparation : demande envoyée en priorité urgente, puzzle préparé renvoyé', async () => {
    const { canaux, client } = preparer();
    const fond = client.generer('jeu-a', 'facile', 'fond', null);
    const autre = client.generer('jeu-a', 'moyen', 'fond', null);
    const puzzle = puzzleFactice('jeu-a', 'expert');
    const p = client.preparer(puzzle, { nombreAuDepart: true });
    const canal = canaux[0];
    // La génération de fond déjà en cours finit d'abord, puis la préparation passe devant l'autre
    canal?.recepteurs.message({ type: 'echec', requete: derniereGeneration(canal).requete, raison: 'budget' });
    assert.deepEqual(await fond.resultat, { statut: 'echec', raison: 'budget' });
    const envoi = canal?.envoyes.at(-1);
    assert.ok(envoi !== undefined && envoi.type === 'preparer');
    assert.deepEqual({ jeu: envoi.jeu, puzzle: envoi.puzzle, options: envoi.options }, { jeu: 'jeu-a', puzzle, options: { nombreAuDepart: true } });
    const prepare = { ...puzzle, graine: 1 };
    canal?.recepteurs.message({ type: 'genere', requete: envoi.requete, puzzle: prepare });
    assert.deepEqual(await p.resultat, { statut: 'ok', puzzle: prepare });
    autre.annuler();
  });

  test('une demande à la fois ; « urgent » passe avant « fond »', async () => {
    const { canaux, client } = preparer();
    const a = client.generer('jeu-a', 'facile', 'fond', null);
    const b = client.generer('jeu-a', 'moyen', 'fond', null);
    const c = client.generer('jeu-a', 'expert', 'urgent', null);
    const canal = canaux[0];
    assert.equal(canal?.envoyes.length, 1, 'une seule demande envoyée au worker');
    canal?.recepteurs.message({ type: 'echec', requete: derniereGeneration(canal).requete, raison: 'budget' });
    assert.deepEqual(await a.resultat, { statut: 'echec', raison: 'budget' });
    assert.equal(derniereGeneration(canal).niveau, 'expert', 'l\'urgente passe devant');
    canal?.recepteurs.message({ type: 'erreur', requete: derniereGeneration(canal).requete, message: 'oups' });
    assert.deepEqual(await c.resultat, { statut: 'erreur', message: 'oups' });
    assert.equal(derniereGeneration(canal).niveau, 'moyen');
    b.annuler();
    assert.deepEqual(await b.resultat, { statut: 'annule' });
  });

  test('annulation dans la file : jamais envoyée, les autres continuent', async () => {
    const { canaux, client } = preparer();
    client.generer('jeu-a', 'facile', 'fond', null);
    const b = client.generer('jeu-a', 'moyen', 'fond', null);
    b.annuler();
    assert.deepEqual(await b.resultat, { statut: 'annule' });
    const canal = canaux[0];
    canal?.recepteurs.message({ type: 'echec', requete: derniereGeneration(canal).requete, raison: 'x' });
    await laisserFiler();
    assert.equal(canal?.envoyes.length, 1, 'la demande annulée n\'a pas été envoyée');
    assert.equal(canal?.arrete, false);
  });

  test('annulation en cours de calcul : le worker est arrêté, un nouveau sert la suite', async () => {
    const { canaux, client } = preparer();
    const a = client.generer('jeu-a', 'expert', 'fond', null);
    const b = client.generer('jeu-a', 'moyen', 'fond', null);
    a.annuler();
    assert.deepEqual(await a.resultat, { statut: 'annule' });
    assert.equal(canaux[0]?.arrete, true);
    assert.equal(canaux.length, 2, 'nouveau worker créé');
    const envoi = derniereGeneration(canaux[1]);
    assert.equal(envoi.niveau, 'moyen');
    // Une réponse tardive de l'ancien worker est ignorée
    canaux[0]?.recepteurs.message({ type: 'genere', requete: envoi.requete, puzzle: puzzleFactice('jeu-a', 'moyen') });
    const puzzle = puzzleFactice('jeu-a', 'moyen');
    canaux[1]?.recepteurs.message({ type: 'genere', requete: envoi.requete, puzzle });
    assert.deepEqual(await b.resultat, { statut: 'ok', puzzle });
    a.annuler(); // sans effet : déjà terminée
  });

  test('garde-fou : worker muet au-delà du budget + marge → erreur, worker remplacé', async () => {
    const { horloge, canaux, client } = preparer(1000, 500);
    const a = client.generer('jeu-a', 'expert', 'fond', null);
    const b = client.generer('jeu-a', 'moyen', 'fond', null);
    horloge.avancer(1499);
    assert.equal(canaux[0]?.arrete, false);
    horloge.avancer(1);
    const r = await a.resultat;
    assert.equal(r.statut, 'erreur');
    assert.equal(canaux[0]?.arrete, true);
    assert.equal(derniereGeneration(canaux[1]).niveau, 'moyen');
    b.annuler();
  });

  test('budget propre à une demande : envoyé au worker, garde-fou réglé dessus', async () => {
    const { horloge, canaux, client } = preparer(1000, 500);
    const a = client.generer('jeu-a', 'expert', 'fond', 30_000);
    assert.equal(derniereGeneration(canaux[0]).budgetMs, 30_000);
    horloge.avancer(30_499);
    assert.equal(canaux[0]?.arrete, false, 'pas d\'arrêt avant budget de la demande + marge');
    horloge.avancer(1);
    assert.equal((await a.resultat).statut, 'erreur');
    assert.equal(canaux[0]?.arrete, true);
  });

  test('budget invalide : erreur immédiate, rien n\'est envoyé', async () => {
    const { canaux, client } = preparer();
    const r = await client.generer('jeu-a', 'moyen', 'fond', 0).resultat;
    assert.equal(r.statut, 'erreur');
    assert.equal(canaux.length, 0);
  });

  test('le garde-fou est annulé quand la réponse arrive', async () => {
    const { horloge, canaux, client } = preparer();
    const a = client.generer('jeu-a', 'moyen', 'fond', null);
    const canal = canaux[0];
    canal?.recepteurs.message({ type: 'echec', requete: derniereGeneration(canal).requete, raison: 'x' });
    await a.resultat;
    assert.equal(horloge.enAttente, 0);
  });

  test('worker planté ; réponse invalide ; réponses périmées ignorées', async () => {
    const { canaux, client } = preparer();
    const a = client.generer('jeu-a', 'moyen', 'fond', null);
    canaux[0]?.recepteurs.message({ type: 'genere', requete: 999, puzzle: puzzleFactice('jeu-a', 'moyen') });
    canaux[0]?.recepteurs.message('n\'importe quoi');
    canaux[0]?.recepteurs.erreur('fichier introuvable');
    assert.match(String((await a.resultat).statut), /erreur/);
    assert.equal(canaux[0]?.arrete, true);

    const b = client.generer('jeu-a', 'moyen', 'fond', null);
    const canal = canaux[1];
    canal?.recepteurs.message({ type: 'genere', requete: derniereGeneration(canal).requete, puzzle: { faux: 1 } });
    assert.deepEqual(await b.resultat, { statut: 'erreur', message: 'Grille reçue invalide' });
  });

  test('verifier : vrai si le worker répond, faux après le délai', async () => {
    const { horloge, canaux, client } = preparer();
    const ok = client.verifier(5000);
    assert.deepEqual(canaux[0]?.envoyes, [{ type: 'ping' }]);
    canaux[0]?.recepteurs.message({ type: 'pret' });
    assert.equal(await ok, true);
    const muet = client.verifier(5000);
    horloge.avancer(5000);
    assert.equal(await muet, false);
  });

  test('fermer : tout est annulé, le worker arrêté, les nouvelles demandes annulées', async () => {
    const { canaux, client } = preparer();
    const a = client.generer('jeu-a', 'moyen', 'fond', null);
    const b = client.generer('jeu-a', 'facile', 'urgent', null);
    client.fermer();
    assert.deepEqual(await a.resultat, { statut: 'annule' });
    assert.deepEqual(await b.resultat, { statut: 'annule' });
    assert.equal(canaux.every((c) => c.arrete), true);
    assert.deepEqual(await client.generer('jeu-a', 'moyen', 'fond', null).resultat, { statut: 'annule' });
  });

  test('intégration : client + traitement réel du worker sur le jeu modèle', async () => {
    // Faux worker qui exécute le vrai traitement (sans thread) de façon asynchrone
    const fabrique: FabriqueCanal = (recepteurs) => ({
      envoyer: (demande) => {
        if (demande.type !== 'generer') return;
        void traiterGeneration(demande, async () => logiqueModele, () => 0).then((r) => recepteurs.message(r));
      },
      arreter: () => undefined,
    });
    const client = creerClientWorker({ fabrique, tirerGraine: () => 42 });
    const r = await client.generer('_modele', 'difficile', 'urgent', null).resultat;
    assert.equal(r.statut, 'ok');
    if (r.statut === 'ok') {
      assert.equal(r.puzzle.graine, 42);
      assert.equal(r.puzzle.notation.niveau, 'difficile');
    }
    client.fermer();
  });
});
