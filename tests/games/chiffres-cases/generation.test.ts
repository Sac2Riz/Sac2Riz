// Tests de la génération par niveau des chiffres casés et sûreté du solveur sur grilles générées.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compterSolutions } from '../../../src/games/chiffres-cases/backtracking.ts';
import { genererCases, PARAMETRES_NIVEAUX } from '../../../src/games/chiffres-cases/generateur.ts';
import { estSymetrique } from '../../../src/games/chiffres-cases/grille.ts';
import { logique } from '../../../src/games/chiffres-cases/logique.ts';
import { structureDe } from '../../../src/games/chiffres-cases/probleme.ts';
import { etatDepart } from '../../../src/games/chiffres-cases/solveur/etat.ts';
import type { DonneesCases } from '../../../src/games/chiffres-cases/types.ts';
import type { Niveau } from '../../../src/types/niveaux.ts';
import { creerAlea } from '../../../src/utils/alea.ts';
import { verifierSurete } from './aide.ts';

/** Niveaux rapides à générer (Expert et Diabolique : test du contrat et test long). */
const NIVEAUX_RAPIDES: readonly Niveau[] = ['debutant', 'facile', 'moyen', 'difficile'];

function generer(niveau: Niveau, graine: number): DonneesCases {
  const r = genererCases(niveau, creerAlea(graine), { tentativesMax: 200 });
  assert.ok(r.ok, `${niveau} / graine ${graine}`);
  assert.equal(r.notation.niveau, niveau);
  return r.donnees;
}

describe('chiffres casés : génération par niveau', () => {
  for (const niveau of NIVEAUX_RAPIDES) {
    test(`${niveau} : grille valide, symétrique, unique, dimensions et pré-placés du niveau`, () => {
      const params = PARAMETRES_NIVEAUX[niveau];
      for (let graine = 1; graine <= 5; graine++) {
        const donnees = generer(niveau, graine);
        assert.ok(logique.estDonnees(donnees));
        const { probleme: p, solution } = structureDe(donnees);
        assert.equal(donnees.largeur, params.largeur);
        assert.equal(donnees.hauteur, params.hauteur);
        assert.ok(estSymetrique(p.grille));
        assert.ok(donnees.preplaces.length >= params.preplacesMin && donnees.preplaces.length <= params.preplacesMax);
        const donnes = donnees.preplaces.map((emplacement) => ({ emplacement, nombre: solution[emplacement] ?? -1 }));
        assert.equal(compterSolutions(p, etatDepart(p, donnes)).nombre, 1, 'solution unique');
        verifierSurete(donnees);
      }
    });
  }

  test('même graine → même grille', () => {
    assert.deepEqual(genererCases('moyen', creerAlea(7)), genererCases('moyen', creerAlea(7)));
  });

  test('budget de temps : arrêt dès que doitArreter répond vrai', () => {
    let appels = 0;
    const r = genererCases('diabolique', creerAlea(1), { doitArreter: () => ++appels > 3 });
    assert.equal(r.ok, false);
  });

  test('sans budget ni limite d\'essais : refusé (boucle infinie)', () => {
    assert.throws(() => genererCases('facile', creerAlea(1), { tentativesMax: null }));
  });
});
