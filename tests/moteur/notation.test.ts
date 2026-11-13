// Tests de la notation : cohérence niveau / étapes / force, seuils figés, grilles rejetées.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { genererGrille } from '../../src/moteur/generateur.ts';
import { creerContexte } from '../../src/moteur/logique/contexte.ts';
import { resoudreLogique } from '../../src/moteur/logique/solveur.ts';
import { techniqueParId } from '../../src/moteur/logique/techniques/index.ts';
import {
  calculerForce,
  mesurerNotation,
  niveauDesEtapes,
  noterGrille,
  SEUILS_FORCE,
  VERSION_NOTATION,
} from '../../src/moteur/notation.ts';
import { definitionClassique } from '../../src/moteur/regions.ts';
import { IDS_TECHNIQUES, type Etape, type IdTechnique } from '../../src/types/logique.ts';
import { INFOS_NIVEAUX, NIVEAUX, type Niveau } from '../../src/types/niveaux.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { ENONCE_DIFFICILE, ENONCE_UNIQUE } from './grilles-connues.ts';

const def9 = definitionClassique(9, 3, 3);
const ctx9 = creerContexte(def9);

/** Étape factice d'une technique (seuls la technique et le niveau comptent pour la notation). */
function etape(technique: IdTechnique): Etape {
  return {
    technique,
    niveau: techniqueParId(technique).niveau,
    cellules: [],
    candidatsMotif: [],
    regions: [],
    placements: [],
    eliminations: [],
    explication: '',
  };
}
const fois = (n: number, technique: IdTechnique): Etape[] => Array.from({ length: n }, () => etape(technique));
/** Énoncé factice avec un nombre donné de chiffres (seul ce nombre compte pour mesurerNotation). */
const avecIndices = (n: number): number[] => Array.from({ length: 81 }, (_, c) => (c < n ? 1 : 0));

describe('notation : seuils figés', () => {
  test('les seuils et la liste des techniques correspondent à VERSION_NOTATION', () => {
    // Si ce test échoue après un changement volontaire : incrémenter VERSION_NOTATION,
    // mettre à jour ce test, docs/DIFFICULTE.md, puis régénérer les packs (npm run packs).
    assert.equal(VERSION_NOTATION, 1);
    assert.deepEqual(SEUILS_FORCE, {
      debutant: { score: null, indices: 39 },
      facile: { score: 4, indices: 30 },
      moyen: { score: 4, indices: 26 },
      difficile: { score: 3, indices: 26 },
    });
    assert.equal(IDS_TECHNIQUES.length, 21);
  });
});

describe('mesurerNotation', () => {
  test('score = étapes du niveau max + ½ × niveau inférieur s\'il est au moins Moyen', () => {
    const etapes = [...fois(2, 'skyscraper'), ...fois(3, 'pointing'), ...fois(10, 'singleton-nu')];
    assert.deepEqual(mesurerNotation(avecIndices(27), etapes, 'difficile'), { score: 3.5, indices: 27 });
  });

  test('les singletons ne comptent pas comme niveau inférieur (Facile, Moyen)', () => {
    const facile = [...fois(3, 'singleton-nu'), ...fois(20, 'singleton-cache-bloc')];
    assert.equal(mesurerNotation(avecIndices(30), facile, 'facile').score, 3);
    const moyen = [...fois(2, 'paire-nue'), ...fois(20, 'singleton-cache')];
    assert.equal(mesurerNotation(avecIndices(30), moyen, 'moyen').score, 2);
  });
});

describe('calculerForce : limites des seuils', () => {
  test('Débutant : seuls les chiffres donnés comptent (≤ 39 → 2)', () => {
    assert.equal(calculerForce('debutant', { score: 100, indices: 40 }), 1);
    assert.equal(calculerForce('debutant', { score: 0, indices: 39 }), 2);
  });

  test('Facile : score ≥ 4 ou ≤ 30 chiffres → 4', () => {
    assert.equal(calculerForce('facile', { score: 3.5, indices: 31 }), 3);
    assert.equal(calculerForce('facile', { score: 4, indices: 35 }), 4);
    assert.equal(calculerForce('facile', { score: 0, indices: 30 }), 4);
  });

  test('Moyen : score ≥ 4 ou ≤ 26 chiffres → 6', () => {
    assert.equal(calculerForce('moyen', { score: 3.5, indices: 27 }), 5);
    assert.equal(calculerForce('moyen', { score: 4, indices: 30 }), 6);
    assert.equal(calculerForce('moyen', { score: 1, indices: 26 }), 6);
  });

  test('Difficile : score ≥ 3 ou ≤ 26 chiffres → 8', () => {
    assert.equal(calculerForce('difficile', { score: 2.5, indices: 27 }), 7);
    assert.equal(calculerForce('difficile', { score: 3, indices: 30 }), 8);
    assert.equal(calculerForce('difficile', { score: 1, indices: 26 }), 8);
  });

  test('Expert = 9 et Diabolique = 10, quelles que soient les mesures', () => {
    for (const mesures of [{ score: 0, indices: 40 }, { score: 20, indices: 20 }]) {
      assert.equal(calculerForce('expert', mesures), 9);
      assert.equal(calculerForce('diabolique', mesures), 10);
    }
  });
});

describe('noterGrille', () => {
  test('grille connue : résolue et notée de façon cohérente', () => {
    const notation = noterGrille(ctx9, ENONCE_UNIQUE);
    assert.ok(notation !== null);
    const { etapes } = resoudreLogique(ctx9, ENONCE_UNIQUE);
    assert.equal(notation.niveau, niveauDesEtapes(etapes));
  });

  test('grille qui exige de l\'essai-erreur : null', () => {
    assert.equal(resoudreLogique(ctx9, ENONCE_DIFFICILE).statut, 'bloque');
    assert.equal(noterGrille(ctx9, ENONCE_DIFFICILE), null);
  });

  test('cohérence sur 60 grilles générées : niveau, technique max, détails, force', () => {
    const vus = new Set<Niveau>();
    for (let graine = 1; graine <= 60; graine++) {
      const { enonce } = genererGrille(def9, creerAlea(graine));
      const resultat = resoudreLogique(ctx9, enonce);
      const notation = noterGrille(ctx9, enonce);
      if (resultat.statut !== 'resolu') {
        assert.equal(notation, null, `graine ${graine}`);
        continue;
      }
      assert.ok(notation !== null, `graine ${graine}`);
      vus.add(notation.niveau);
      // Niveau = niveau de l'étape la plus dure ; la technique max est de ce niveau
      const rangMax = Math.max(...resultat.etapes.map((e) => NIVEAUX.indexOf(e.niveau)));
      assert.equal(notation.niveau, NIVEAUX[rangMax]);
      const techniqueMax = IDS_TECHNIQUES.find((id) => id === notation.techniqueMax);
      assert.ok(techniqueMax !== undefined, `technique inconnue : ${notation.techniqueMax}`);
      assert.equal(techniqueParId(techniqueMax).niveau, notation.niveau);
      // Détails : chaque étape comptée une fois
      const total = Object.values(notation.details).reduce((s, n) => s + n, 0);
      assert.equal(total, resultat.etapes.length);
      // Force dans la plage du niveau, et égale au calcul à partir des mesures
      const { forceMin, forceMax } = INFOS_NIVEAUX[notation.niveau];
      assert.ok(notation.force >= forceMin && notation.force <= forceMax);
      assert.equal(notation.force, calculerForce(notation.niveau, mesurerNotation(enonce, resultat.etapes, notation.niveau)));
      // Reproductible
      assert.deepEqual(noterGrille(ctx9, enonce), notation);
    }
    assert.ok(vus.size >= 3, 'les grilles générées devraient couvrir plusieurs niveaux');
  });
});
