// TEST LONG du Tectonic (« npm run test:long », hors de « npm run check »).
// À lancer quand on touche au moteur, aux techniques, à la construction ou au générateur du Tectonic.
//  1. Grilles générées pour chaque niveau : chaque étape du solveur est juste (comparée à la solution
//     unique trouvée par le backtracking), et toutes résolues.
//  2. Grilles minimales brutes (retrait sans fonction d'acceptation, de 6 × 6 à 10 × 10, zones ≤ 5 ou 6) :
//     le solveur ne se trompe jamais, qu'il résolve ou qu'il bloque.
//  3. Chaque technique du Tectonic sert au moins une fois (sauf exceptions justifiées).
//  4. Contrat LogiqueJeu des niveaux lents (Difficile à Diabolique).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { retirerChiffres } from '../../../src/moteur/generateur.ts';
import { construireGrille } from '../../../src/games/tectonic/construction.ts';
import { parametresGrille } from '../../../src/games/tectonic/generateur.ts';
import { structureDe, structureTectonic } from '../../../src/games/tectonic/grille.ts';
import { logique } from '../../../src/games/tectonic/logique.ts';
import { IDS_TECHNIQUES_TECTONIC, TECHNIQUES_TECTONIC } from '../../../src/games/tectonic/techniques.ts';
import type { IdTechnique } from '../../../src/types/logique.ts';
import { NIVEAUX, type Niveau } from '../../../src/types/niveaux.ts';
import { creerAlea } from '../../../src/utils/alea.ts';
import { nouveauBilan, verifierGrille, type Bilan } from '../../moteur/logique/surete-commun.ts';
import { verifierLogique } from '../verifier-module.ts';
import { grille, NIVEAUX_RAPIDES } from './aide.ts';

const GRILLES_PAR_NIVEAU: Readonly<Record<Niveau, number>> = {
  debutant: 50,
  facile: 50,
  moyen: 50,
  difficile: 40,
  expert: 15,
  diabolique: 15,
};

/**
 * Techniques jamais indispensables en pratique (testées sur des états préparés) : dans une zone de
 * 5 cases, un quadruplet caché équivaut à un singleton nu trouvé avant lui, et un triplet caché à une
 * paire nue (même remarque qu'au sudoku, docs/DIFFICULTE.md).
 */
const RARES: readonly IdTechnique[] = ['quadruplet-cache', 'triplet-cache', 'quadruplet-nu'];

const bilan: Bilan = nouveauBilan();

describe('Tectonic : sûreté du solveur (test long)', () => {
  for (const niveau of NIVEAUX) {
    test(`${niveau} : ${GRILLES_PAR_NIVEAU[niveau]} grilles générées, chaque étape juste`, () => {
      const avant = bilan.statuts.resolu;
      for (let graine = 1; graine <= GRILLES_PAR_NIVEAU[niveau]; graine++) {
        const d = grille(niveau, graine);
        verifierGrille(structureDe(d).contexte, d.enonce, d.solution, `${niveau}, graine ${graine}`, bilan, TECHNIQUES_TECTONIC);
      }
      assert.equal(bilan.statuts.resolu - avant, GRILLES_PAR_NIVEAU[niveau], 'toutes résolues');
    });
  }

  test('grilles minimales brutes (6 × 6 à 10 × 10, zones ≤ 5 et ≤ 6) : aucune erreur du solveur', () => {
    const brut = nouveauBilan();
    for (const tailleMax of [5, 6]) {
      for (const cote of [6, 7, 8, 9, 10]) {
        const p = { ...parametresGrille(cote, tailleMax, null), noeudsMax: 20_000 };
        const alea = creerAlea(cote * 10 + tailleMax);
        for (let n = 0; n < 30; ) {
          const pleine = construireGrille(p, alea);
          if (pleine === null) continue;
          n++;
          const s = structureTectonic(cote, cote, pleine.zones);
          const enonce = retirerChiffres(s.definition, pleine.solution, alea, { symetrie: 'aucune' });
          verifierGrille(s.contexte, enonce, pleine.solution, `brute ${cote}×${cote} zones ≤ ${tailleMax} n° ${n}`, brut, TECHNIQUES_TECTONIC);
        }
      }
    }
    for (const [id, k] of brut.usages) bilan.usages.set(id, (bilan.usages.get(id) ?? 0) + k);
    assert.equal(brut.statuts.contradiction, 0);
    assert.ok(brut.statuts.resolu > 0);
  });

  test('chaque technique du Tectonic sert au moins une fois (hors techniques rares)', () => {
    const absentes = IDS_TECHNIQUES_TECTONIC.filter((id) => !RARES.includes(id) && !bilan.usages.has(id));
    assert.deepEqual(absentes, []);
  });

  test('contrat LogiqueJeu des niveaux lents, hors de npm test', () => {
    verifierLogique(logique, NIVEAUX.filter((n) => !NIVEAUX_RAPIDES.includes(n)));
  });
});
