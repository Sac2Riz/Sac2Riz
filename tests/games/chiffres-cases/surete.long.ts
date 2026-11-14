// TEST LONG du solveur des chiffres casés (« npm run test:long », hors de « npm run check »).
// À lancer quand on touche au solveur, aux techniques ou au générateur.
//  1. Grilles générées pour chaque niveau : chaque étape est juste (comparée à la solution),
//     la solution est unique (backtracking), toutes les techniques servent au moins une fois.
//  2. Grilles brutes (motif + chiffres au hasard, sans pré-placé) : le solveur ne se trompe jamais,
//     et quand il résout, le backtracking confirme l'unicité.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compterSolutions } from '../../../src/games/chiffres-cases/backtracking.ts';
import { genererCases, PARAMETRES_NIVEAUX } from '../../../src/games/chiffres-cases/generateur.ts';
import { nombreDe } from '../../../src/games/chiffres-cases/grille.ts';
import { genererMotif } from '../../../src/games/chiffres-cases/motif.ts';
import { creerProbleme, structureDe } from '../../../src/games/chiffres-cases/probleme.ts';
import { remplir } from '../../../src/games/chiffres-cases/remplissage.ts';
import { etatDepart } from '../../../src/games/chiffres-cases/solveur/etat.ts';
import { resoudre } from '../../../src/games/chiffres-cases/solveur/solveur.ts';
import { IDS_TECHNIQUES_CASES } from '../../../src/games/chiffres-cases/solveur/technique.ts';
import { logique } from '../../../src/games/chiffres-cases/logique.ts';
import { NIVEAUX, type Niveau } from '../../../src/types/niveaux.ts';
import { creerAlea } from '../../../src/utils/alea.ts';
import { verifierLogique } from '../verifier-module.ts';
import { NIVEAUX_RAPIDES, verifierSurete } from './aide.ts';

/**
 * Graines Diabolique ajoutées : la technique « hypothèses » (forcing) est rare (3 grilles Diabolique sur
 * 20) ; la graine 17 l'exige. Si le générateur change, ce test le signale : choisir une autre graine.
 */
const GRAINES_EN_PLUS: Readonly<Partial<Record<Niveau, readonly number[]>>> = { diabolique: [17] };

const GRILLES_PAR_NIVEAU: Readonly<Record<Niveau, number>> = {
  debutant: 100,
  facile: 100,
  moyen: 100,
  difficile: 100,
  expert: 20,
  diabolique: 5,
};

describe('chiffres casés : sûreté du solveur (test long)', () => {
  test('contrat LogiqueJeu des niveaux lents (Expert, Diabolique), hors de npm test', () => {
    verifierLogique(logique, NIVEAUX.filter((n) => !NIVEAUX_RAPIDES.includes(n)));
  });

  test('grilles générées : étapes justes, solution unique, toutes les techniques utilisées', () => {
    const utilisees = new Set<string>();
    for (const niveau of NIVEAUX) {
      const graines = [...Array.from({ length: GRILLES_PAR_NIVEAU[niveau] }, (_, i) => i + 1), ...(GRAINES_EN_PLUS[niveau] ?? [])];
      for (const graine of graines) {
        const r = genererCases(niveau, creerAlea(graine), { tentativesMax: 1000 });
        assert.ok(r.ok, `${niveau} / graine ${graine}`);
        for (const t of verifierSurete(r.donnees)) utilisees.add(t);
        const { probleme: p, solution } = structureDe(r.donnees);
        const donnes = r.donnees.preplaces.map((emplacement) => ({ emplacement, nombre: solution[emplacement] ?? -1 }));
        assert.equal(compterSolutions(p, etatDepart(p, donnes)).nombre, 1);
      }
    }
    assert.deepEqual(IDS_TECHNIQUES_CASES.filter((t) => !utilisees.has(t)), [], 'techniques jamais utilisées');
  });

  test('grilles brutes : le solveur ne se trompe jamais', () => {
    for (const niveau of ['moyen', 'difficile'] as const) {
      for (let graine = 1; graine <= 300; graine++) {
        const alea = creerAlea(graine);
        const params = PARAMETRES_NIVEAUX[niveau];
        const grille = genererMotif(params, alea);
        const chiffres = grille === null ? null : remplir(grille, params, alea);
        if (grille === null || chiffres === null) continue;
        const textes = grille.emplacements.map((e) => nombreDe(e, chiffres));
        const p = creerProbleme(grille, textes);
        const solution = textes.map((t) => p.nombres.indexOf(t));
        const r = resoudre(p, etatDepart(p, []));
        assert.notEqual(r.statut, 'contradiction');
        // Toute étape est vraie dans la solution d'origine… sauf si la grille en a plusieurs :
        // alors seules les conclusions communes à toutes sont garanties ; on le vérifie via l'unicité.
        if (r.statut === 'resolu') {
          assert.deepEqual(r.etat.affectes, solution);
          assert.equal(compterSolutions(p, etatDepart(p, [])).nombre, 1);
        }
      }
    }
  });
});
