// Tests du traitement des demandes dans le worker (sans thread : fonctions appelées directement).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { logique as logiqueModele } from '../../src/games/_modele/logique.ts';
import { genererParNiveau, TENTATIVES_MAX_SANS_BUDGET } from '../../src/moteur/generation-niveau.ts';
import { definitionClassique } from '../../src/moteur/regions.ts';
import type { Alea } from '../../src/types/alea.ts';
import type { OptionsGeneration, Puzzle, ResultatGeneration } from '../../src/types/jeu.ts';
import type { DonneesCases } from '../../src/games/chiffres-cases/types.ts';
import type { Niveau } from '../../src/types/niveaux.ts';
import type { DemandeGeneration, DemandePreparation } from '../../src/types/worker.ts';
import { logique as logiqueCases } from '../../src/games/chiffres-cases/logique.ts';
import { estDemande, traiterGeneration, traiterPreparation } from '../../src/worker/traitement.ts';
import { donneesDe } from '../games/chiffres-cases/aide.ts';

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

  test("jeu bâti sur le moteur : seul le budget de temps l'arrête, jamais une limite d'essais", async () => {
    // Même appel que le sudoku classique (doitArreter seul), sur une grille 4 × 4 qui n'atteint
    // jamais le niveau Diabolique : chaque essai échoue, l'horloge avance de 1 ms par consultation.
    const def4 = definitionClassique(4, 2, 2);
    const impossible = {
      ...logiqueModele,
      generer: (n: Niveau, alea: Alea, options: OptionsGeneration): ResultatGeneration<never> => {
        const r = genererParNiveau(def4, n, alea, { doitArreter: options.doitArreter });
        return r.ok ? { ok: false, raison: 'réussite inattendue' } : { ok: false, raison: r.raison };
      },
    };
    let heure = 0;
    const budgetMs = TENTATIVES_MAX_SANS_BUDGET * 3;
    const r = await traiterGeneration({ ...demande, niveau: 'diabolique', budgetMs }, async () => impossible, () => heure++);
    assert.equal(r.type, 'echec');
    if (r.type === 'echec') {
      assert.match(r.raison, /Budget de temps/);
      const essais = Number(/après (\d+) essais/.exec(r.raison)?.[1]);
      assert.ok(essais > TENTATIVES_MAX_SANS_BUDGET, `${essais} essais : plus que la limite sans budget`);
    }
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

describe('traitement des demandes de préparation (aide au départ)', () => {
  // Grille 3 × 3 de chiffres casés, sans pré-placé (une solution unique : 12 / 13 / 246 / 345 / 57 / 67)
  const donnees = donneesDe(['12#', '345', '#67']);
  const puzzle: Puzzle<DonneesCases> = { jeu: 'chiffres-cases', graine: 3, notation: { niveau: 'moyen', force: 4, techniqueMax: 'x', details: {} }, donnees };
  const demandePrep = (nombreAuDepart: boolean): DemandePreparation => ({
    type: 'preparer',
    requete: 9,
    jeu: 'chiffres-cases',
    puzzle,
    options: { nombreAuDepart },
  });

  test('estDemande : préparation valide ; options ou puzzle invalides refusés', () => {
    assert.ok(estDemande(demandePrep(true)));
    assert.ok(estDemande({ ...demandePrep(true), options: {} }), 'aucun réglage : valeurs par défaut');
    assert.equal(estDemande({ ...demandePrep(true), options: null }), false);
    assert.equal(estDemande({ ...demandePrep(true), options: { nombreAuDepart: 'oui' } }), false);
    assert.equal(estDemande({ ...demandePrep(true), puzzle: { jeu: 'chiffres-cases' } }), false);
  });

  test('option active : un pré-placé ajouté, le reste du puzzle inchangé', async () => {
    const r = await traiterPreparation(demandePrep(true), async () => logiqueCases);
    assert.equal(r.type, 'genere');
    if (r.type !== 'genere') return;
    assert.equal(r.requete, 9);
    assert.deepEqual({ ...r.puzzle, donnees: null }, { ...puzzle, donnees: null });
    assert.deepEqual(r.puzzle.donnees, { ...donnees, preplaces: [logiqueCases.preparer(donnees, { nombreAuDepart: true }).preplaces[0]] });
  });

  test('option inactive : puzzle renvoyé tel quel', async () => {
    assert.deepEqual(await traiterPreparation(demandePrep(false), async () => logiqueCases), { type: 'genere', requete: 9, puzzle });
  });

  test("grille d'un autre jeu ou données invalides : erreur", async () => {
    const r = await traiterPreparation({ ...demandePrep(true), jeu: '_modele' }, async () => logiqueModele);
    assert.equal(r.type, 'erreur');
  });
});
