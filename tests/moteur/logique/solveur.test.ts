// Tests du solveur logique : résolution, blocage, contradiction, niveau maximal, garde-fou.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compterSolutions, estUnique } from '../../../src/moteur/backtracking.ts';
import { genererGrille } from '../../../src/moteur/generateur.ts';
import { resoudreLogique, prochaineEtape } from '../../../src/moteur/logique/solveur.ts';
import type { Technique } from '../../../src/moteur/logique/technique.ts';
import { TECHNIQUES, techniqueParId } from '../../../src/moteur/logique/techniques/index.ts';
import { etatInitial } from '../../../src/moteur/logique/etat.ts';
import { IDS_TECHNIQUES } from '../../../src/types/logique.ts';
import { NIVEAUX } from '../../../src/types/niveaux.ts';
import { creerAlea } from '../../../src/utils/alea.ts';
import { ENONCE_DIFFICILE, ENONCE_UNIQUE, SOLUTION_UNIQUE } from '../grilles-connues.ts';
import { ctx9, def9 } from './aide.ts';

describe('liste des techniques', () => {
  test('même ordre que IDS_TECHNIQUES, niveaux croissants', () => {
    assert.deepEqual(
      TECHNIQUES.map((t) => t.id),
      [...IDS_TECHNIQUES],
    );
    for (let i = 1; i < TECHNIQUES.length; i++) {
      const avant = NIVEAUX.indexOf(TECHNIQUES[i - 1]?.niveau ?? 'debutant');
      assert.ok(avant <= NIVEAUX.indexOf(TECHNIQUES[i]?.niveau ?? 'debutant'));
    }
    assert.equal(techniqueParId('x-wing').niveau, 'expert');
  });
});

describe('resoudreLogique', () => {
  test('résout une grille simple (vérifiée par backtracking) et retrouve sa solution', () => {
    assert.ok(estUnique(def9, ENONCE_UNIQUE));
    const resultat = resoudreLogique(ctx9, ENONCE_UNIQUE);
    assert.equal(resultat.statut, 'resolu');
    assert.deepEqual(resultat.etat.valeurs, SOLUTION_UNIQUE);
    assert.equal(resultat.raison, null);
    assert.ok(resultat.etapes.length > 0);
    // Cette grille ne demande que des techniques Débutant
    assert.equal(resoudreLogique(ctx9, ENONCE_UNIQUE, { niveauMax: 'debutant' }).statut, 'resolu');
  });

  test("s'arrête proprement (bloque) sur une grille unique qui exige de l'essai-erreur", () => {
    assert.ok(estUnique(def9, ENONCE_DIFFICILE));
    const resultat = resoudreLogique(ctx9, ENONCE_DIFFICILE);
    assert.equal(resultat.statut, 'bloque');
    assert.equal(resultat.raison, null);
  });

  test('bloque sur une grille vide (plusieurs solutions)', () => {
    const vide = new Array<number>(81).fill(0);
    assert.equal(compterSolutions(def9, vide).nombre, 2);
    const resultat = resoudreLogique(ctx9, vide);
    assert.equal(resultat.statut, 'bloque');
    assert.equal(resultat.etapes.length, 0);
  });

  test('signale une contradiction (deux 5 dans la ligne 1)', () => {
    const enonce = [...ENONCE_UNIQUE];
    enonce[2] = 5; // L1C1 contient déjà un 5
    const resultat = resoudreLogique(ctx9, enonce);
    assert.equal(resultat.statut, 'contradiction');
    assert.match(resultat.raison ?? '', /5/);
  });

  test('niveauMax : aucune technique plus dure, et la grille bloque si elle en a besoin', () => {
    // Première graine dont la grille se résout mais demande plus que le niveau Facile
    let trouvee = false;
    for (let graine = 1; graine <= 100 && !trouvee; graine++) {
      const { enonce } = genererGrille(def9, creerAlea(graine));
      const complet = resoudreLogique(ctx9, enonce);
      if (complet.statut !== 'resolu' || complet.etapes.every((e) => e.niveau === 'debutant' || e.niveau === 'facile')) continue;
      trouvee = true;
      const limite = resoudreLogique(ctx9, enonce, { niveauMax: 'facile' });
      assert.equal(limite.statut, 'bloque');
      assert.ok(limite.etapes.every((e) => e.niveau === 'debutant' || e.niveau === 'facile'));
    }
    assert.ok(trouvee, 'aucune grille adaptée trouvée');
  });

  test('ne modifie pas la grille fournie', () => {
    const enonce = Object.freeze([...ENONCE_UNIQUE]);
    resoudreLogique(ctx9, enonce);
    assert.deepEqual(enonce, ENONCE_UNIQUE);
  });

  test('garde-fou : une étape sans effet arrête le solveur avec une erreur claire', () => {
    const fautive: Technique = {
      id: 'x-wing',
      niveau: 'expert',
      nom: 'Technique fautive',
      // Renvoie toujours la même élimination, même quand le candidat est déjà absent
      chercher: () => ({
        technique: 'x-wing',
        niveau: 'expert',
        cellules: [],
        candidatsMotif: [],
        regions: [],
        placements: [],
        eliminations: [{ cellule: 2, valeurs: [4] }],
        explication: 'Motif fautif.',
      }),
    };
    // 1er passage : le 4 est retiré de L1C3 (effet réel). 2e passage : même étape, le 4 est déjà
    // absent ; sans garde-fou, le solveur tournerait en rond indéfiniment.
    assert.throws(
      () => resoudreLogique(ctx9, ENONCE_UNIQUE, { techniques: [fautive] }),
      /la technique « x-wing » a renvoyé une étape sans effet/,
    );
  });
});

describe('prochaineEtape', () => {
  test('renvoie la première étape (la plus simple) ou null', () => {
    const etape = prochaineEtape(ctx9, etatInitial(ctx9, ENONCE_UNIQUE));
    assert.ok(etape !== null && ['dernier-chiffre', 'singleton-cache-bloc'].includes(etape.technique));
    assert.equal(prochaineEtape(ctx9, etatInitial(ctx9, ENONCE_DIFFICILE)), null);
  });
});
