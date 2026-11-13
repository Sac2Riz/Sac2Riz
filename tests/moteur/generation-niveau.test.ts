// Tests de la génération par niveau : niveau exact, unicité, symétrie, arrêt tôt,
// reproductibilité, échec propre quand tentativesMax est atteint ou que doitArreter répond vrai.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { estUnique } from '../../src/moteur/backtracking.ts';
import { CIBLES_ARRET_TOT, genererParNiveau } from '../../src/moteur/generation-niveau.ts';
import { creerContexte } from '../../src/moteur/logique/contexte.ts';
import { noterGrille } from '../../src/moteur/notation.ts';
import { definitionClassique } from '../../src/moteur/regions.ts';
import { estSolution } from '../../src/moteur/validation.ts';
import type { ValeursGrille } from '../../src/types/grille.ts';
import { NIVEAUX } from '../../src/types/niveaux.ts';
import { creerAlea } from '../../src/utils/alea.ts';

const def9 = definitionClassique(9, 3, 3);
const ctx9 = creerContexte(def9);
const compterIndices = (g: ValeursGrille): number => g.filter((v) => v !== 0).length;
const estSymetrique = (g: ValeursGrille): boolean => g.every((v, c) => (v === 0) === (g[g.length - 1 - c] === 0));

describe('genererParNiveau', () => {
  for (const niveau of NIVEAUX) {
    test(`${niveau} : grille du niveau exact, unique, symétrique, notation fidèle`, () => {
      for (let graine = 1; graine <= 2; graine++) {
        const r = genererParNiveau(def9, niveau, creerAlea(graine), { tentativesMax: 200 });
        assert.ok(r.ok, `graine ${graine} : échec`);
        assert.equal(r.notation.niveau, niveau);
        assert.ok(estSolution(def9, r.solution));
        r.enonce.forEach((v, c) => {
          if (v !== 0) assert.equal(v, r.solution[c]);
        });
        assert.ok(estUnique(def9, r.enonce), 'solution non unique');
        assert.ok(estSymetrique(r.enonce), 'symétrie centrale non respectée');
        assert.deepEqual(noterGrille(ctx9, r.enonce), r.notation);
      }
    });
  }

  test('arrêt tôt : Débutant et Facile gardent le nombre de chiffres visé', () => {
    for (const niveau of ['debutant', 'facile'] as const) {
      const plage = CIBLES_ARRET_TOT[niveau];
      assert.ok(plage !== null);
      for (let graine = 1; graine <= 10; graine++) {
        const r = genererParNiveau(def9, niveau, creerAlea(graine));
        assert.ok(r.ok);
        const n = compterIndices(r.enonce);
        // Avec la symétrie, deux cases partent à la fois : la cible peut être dépassée d'une case
        assert.ok(n >= plage.min - 1 && n <= plage.max, `${niveau}, graine ${graine} : ${n} chiffres`);
      }
    }
  });

  test('même graine → même grille', () => {
    const a = genererParNiveau(def9, 'moyen', creerAlea(7));
    const b = genererParNiveau(def9, 'moyen', creerAlea(7));
    assert.deepEqual(a, b);
  });

  test('sans symétrie : grille du niveau demandé', () => {
    const r = genererParNiveau(def9, 'expert', creerAlea(1), { symetrie: 'aucune', tentativesMax: 200 });
    assert.ok(r.ok);
    assert.equal(r.notation.niveau, 'expert');
    assert.ok(estUnique(def9, r.enonce));
  });

  test('échec propre quand tentativesMax est atteint', () => {
    let echecs = 0;
    for (let graine = 1; graine <= 20; graine++) {
      const r = genererParNiveau(def9, 'expert', creerAlea(graine), { tentativesMax: 1 });
      if (r.ok) {
        assert.equal(r.essais, 1);
      } else {
        echecs++;
        assert.equal(r.essais, 1);
        assert.match(r.raison, /expert/);
      }
    }
    assert.ok(echecs > 0, 'au moins un échec attendu avec un seul essai');
  });

  test('doitArreter : au moins un essai, puis arrêt dès qu\'il répond vrai', () => {
    // Sur 20 graines, plusieurs ratent leur premier essai Expert (voir le test précédent)
    let appels = 0;
    for (let graine = 1; graine <= 20; graine++) {
      const r = genererParNiveau(def9, 'expert', creerAlea(graine), {
        tentativesMax: 1000,
        doitArreter: () => {
          appels++;
          return true;
        },
      });
      if (!r.ok) {
        assert.equal(r.essais, 1);
        assert.match(r.raison, /Budget de temps/);
      }
    }
    assert.ok(appels > 0, 'doitArreter doit être consulté après un premier essai raté');
  });

  test('doitArreter vrai à partir du 4e appel : 4 essais au plus', () => {
    let appels = 0;
    const r = genererParNiveau(def9, 'expert', creerAlea(7), { tentativesMax: 1000, doitArreter: () => ++appels > 3 });
    assert.ok(r.essais <= 4);
    if (!r.ok) assert.equal(r.essais, 4);
  });
});
