// Tests du traitement des demandes dans le worker (sans thread : fonctions appelées directement).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { logique as logiqueModele } from '../../src/games/_modele/logique.ts';
import type { Alea } from '../../src/types/alea.ts';
import type { OptionsGeneration, ResultatGeneration } from '../../src/types/jeu.ts';
import type { Niveau } from '../../src/types/niveaux.ts';
import type { DemandeGeneration } from '../../src/types/worker.ts';
import { estDemande, traiterGeneration } from '../../src/worker/traitement.ts';

const demande: DemandeGeneration = { type: 'generer', requete: 7, jeu: '_modele', niveau: 'moyen', graine: 5, budgetMs: 1000 };

describe('traitement des demandes du worker', () => {
  test('estDemande : formes valides et invalides', () => {
    assert.ok(estDemande({ type: 'ping' }));
    assert.ok(estDemande(demande));
    assert.equal(estDemande({ ...demande, budgetMs: 0 }), false);
    assert.equal(estDemande({ ...demande, budgetMs: 10_000_000 }), false);
    assert.equal(estDemande({ ...demande, niveau: 'extreme' }), false);
    assert.equal(estDemande({ ...demande, tentativesMax: 50, budgetMs: undefined }), false);
    assert.equal(estDemande('ping'), false);
  });

  test('génération réussie : puzzle complet, reproductible par la graine', async () => {
    const r1 = await traiterGeneration(demande, async () => logiqueModele, () => 0);
    const r2 = await traiterGeneration(demande, async () => logiqueModele, () => 0);
    assert.equal(r1.type, 'genere');
    if (r1.type === 'genere') {
      assert.equal(r1.requete, 7);
      assert.equal(r1.puzzle.jeu, '_modele');
      assert.equal(r1.puzzle.graine, 5);
      assert.equal(r1.puzzle.notation.niveau, 'moyen');
    }
    assert.deepEqual(r1, r2);
  });

  test('budget de temps : doitArreter devient vrai à l\'échéance → « echec »', async () => {
    let heure = 0;
    let consultations = 0;
    // Jeu qui n'y arrive jamais : chaque essai « dure » 100 ms
    const jamais = {
      ...logiqueModele,
      generer: (_n: Niveau, _a: Alea, options: OptionsGeneration): ResultatGeneration<never> => {
        while (!options.doitArreter()) {
          consultations++;
          heure += 100;
        }
        return { ok: false, raison: `abandon après ${consultations} essais` };
      },
    };
    const r = await traiterGeneration(demande, async () => jamais, () => heure);
    assert.deepEqual(r, { type: 'echec', requete: 7, raison: 'abandon après 10 essais' });
  });

  test('jeu introuvable ou qui plante → « erreur »', async () => {
    const r = await traiterGeneration(
      demande,
      async () => {
        throw new Error('Module logique invalide');
      },
      () => 0,
    );
    assert.deepEqual(r, { type: 'erreur', requete: 7, message: 'Module logique invalide' });
  });
});
