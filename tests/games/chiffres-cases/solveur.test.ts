// Tests du solveur logique, du backtracking et de la notation des chiffres casés.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compterSolutions } from '../../../src/games/chiffres-cases/backtracking.ts';
import { calculerForce, noterProbleme, SEUILS_FORCE_CASES, VERSION_NOTATION_CASES } from '../../../src/games/chiffres-cases/notation.ts';
import { contradiction, etatDepart } from '../../../src/games/chiffres-cases/solveur/etat.ts';
import { resoudre, techniquesJusqua } from '../../../src/games/chiffres-cases/solveur/solveur.ts';
import { IDS_TECHNIQUES_CASES } from '../../../src/games/chiffres-cases/solveur/technique.ts';
import { TECHNIQUES_CASES } from '../../../src/games/chiffres-cases/solveur/techniques/index.ts';
import { NIVEAUX } from '../../../src/types/niveaux.ts';
import { etatAvec, H1, n, structureA, V1 } from './aide.ts';

describe('chiffres casés : solveur et notation', () => {
  test('techniques dans l\'ordre des identifiants, niveaux croissants', () => {
    assert.deepEqual(TECHNIQUES_CASES.map((t) => t.id), [...IDS_TECHNIQUES_CASES]);
    const rangs = TECHNIQUES_CASES.map((t) => NIVEAUX.indexOf(t.niveau));
    assert.deepEqual(rangs, [...rangs].sort((a, b) => a - b));
    assert.deepEqual(techniquesJusqua('facile').map((t) => t.id), ['longueur-unique', 'motif-unique', 'place-unique']);
    for (const niveau of NIVEAUX) assert.ok(TECHNIQUES_CASES.some((t) => t.niveau === niveau), `aucune technique ${niveau}`);
  });

  test('grille A : deux solutions → solveur bloqué, backtracking à 2', () => {
    const { p } = structureA();
    assert.equal(resoudre(p, etatDepart(p, [])).statut, 'bloque');
    assert.equal(compterSolutions(p, etatDepart(p, [])).nombre, 2);
    assert.equal(noterProbleme(p, []), null);
  });

  test('grille A avec 123 pré-placé : résolue au niveau Débutant, solution unique', () => {
    const { p, s } = structureA([H1]);
    const donnes = [{ emplacement: H1, nombre: n(p, '123') }];
    const r = resoudre(p, etatDepart(p, donnes));
    assert.equal(r.statut, 'resolu');
    assert.deepEqual(r.etat.affectes, s.solution);
    assert.ok(r.etapes.every((e) => e.niveau === 'debutant'));
    const bt = compterSolutions(p, etatDepart(p, donnes));
    assert.equal(bt.nombre, 1);
    assert.deepEqual(bt.solution, s.solution);
    const notation = noterProbleme(p, donnes);
    assert.equal(notation?.niveau, 'debutant');
    assert.ok(notation !== null && notation.details['motif-unique'] !== undefined);
  });

  test('contradictions détectées', () => {
    const { p } = structureA();
    assert.ok(contradiction(p, etatAvec(p, [['123'], [], ['358'], ['678']]))); // emplacement sans candidat
    assert.ok(contradiction(p, etatAvec(p, [['123'], ['123'], ['358'], ['678']]))); // 146 ne va nulle part
    assert.equal(contradiction(p, etatAvec(p, [['123'], ['146'], ['358'], ['678']])), false);
    // Un nombre posé qui contredit un croisé vide ses candidats
    const r = resoudre(p, etatDepart(p, [{ emplacement: H1, nombre: n(p, '123') }, { emplacement: V1, nombre: n(p, '358') }]));
    assert.equal(r.statut, 'contradiction');
  });

  test('force : seuils et plages', () => {
    assert.equal(VERSION_NOTATION_CASES, 1);
    const m = { score: 0, groupe: 0, preplaces: 0 };
    assert.equal(calculerForce('expert', m), 9);
    assert.equal(calculerForce('diabolique', m), 10);
    for (const niveau of ['debutant', 'facile', 'moyen', 'difficile'] as const) {
      const s = SEUILS_FORCE_CASES[niveau];
      const basse = calculerForce(niveau, m);
      const haute = calculerForce(niveau, { score: s.score ?? 0, groupe: s.groupe ?? 0, preplaces: 0 });
      assert.equal(haute, basse + 1);
    }
  });
});
