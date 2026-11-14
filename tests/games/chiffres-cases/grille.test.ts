// Tests du modèle de grille des chiffres casés : emplacements, croisements, liste, motif, remplissage.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { casesIsolees, estConnexe, estSymetrique, grilleDe, nombreDe, nomEmplacement } from '../../../src/games/chiffres-cases/grille.ts';
import { PARAMETRES_NIVEAUX } from '../../../src/games/chiffres-cases/generateur.ts';
import { genererMotif } from '../../../src/games/chiffres-cases/motif.ts';
import { creerProbleme, trierNombres } from '../../../src/games/chiffres-cases/probleme.ts';
import { remplir } from '../../../src/games/chiffres-cases/remplissage.ts';
import { NIVEAUX } from '../../../src/types/niveaux.ts';
import { creerAlea } from '../../../src/utils/alea.ts';
import { H1, H3, structureA, V1, V3 } from './aide.ts';

describe('chiffres casés : grille', () => {
  test('emplacements numérotés par première case, l\'horizontal d\'abord', () => {
    const { p, s } = structureA();
    const sens = p.grille.emplacements.map((e) => `${e.sens}:${e.cellules.join(',')}`);
    assert.deepEqual(sens, ['horizontal:0,1,2', 'vertical:0,3,6', 'vertical:2,5,8', 'horizontal:6,7,8']);
    assert.deepEqual(s.solutionTexte, ['123', '146', '358', '678']);
    assert.equal(nomEmplacement(p.grille, H1), 'l\'horizontal en L1C1');
    assert.equal(nomEmplacement(p.grille, V3), 'le vertical en L1C3');
  });

  test('croisements et emplacements par case', () => {
    const { p } = structureA();
    assert.deepEqual(p.grille.croisements[H1], [
      { cellule: 0, autre: V1, position: 0, positionAutre: 0 },
      { cellule: 2, autre: V3, position: 2, positionAutre: 0 },
    ]);
    assert.deepEqual(p.grille.parCase[4], []); // case noire
    assert.deepEqual(p.grille.parCase[3], [V1]); // case non croisée
    assert.deepEqual(p.grille.parCase[8], [V3, H3]);
  });

  test('une suite d\'une seule case n\'est pas un emplacement', () => {
    const g = grilleDe(3, 3, [false, false, true, false, true, true, true, true, true]);
    assert.equal(g.emplacements.length, 2);
    assert.deepEqual(casesIsolees(grilleDe(3, 1, [false, true, false])), [0, 2]);
  });

  test('connexité et symétrie', () => {
    const { p } = structureA();
    assert.ok(estConnexe(p.grille));
    assert.ok(estSymetrique(p.grille));
    const coupee = grilleDe(5, 2, [false, false, true, false, false, false, false, true, false, false]);
    assert.equal(estConnexe(coupee), false);
  });

  test('liste triée par longueur puis par valeur ; liste incompatible refusée', () => {
    assert.deepEqual(trierNombres(['345', '12', '99', '1000', '123']), ['12', '99', '123', '345', '1000']);
    const { p } = structureA();
    assert.throws(() => creerProbleme(p.grille, ['12', '146', '358', '678']));
  });

  test('motifs générés : symétriques, connexes, sans case isolée, longueurs bornées', () => {
    for (const niveau of NIVEAUX) {
      const params = PARAMETRES_NIVEAUX[niveau];
      for (let graine = 1; graine <= 20; graine++) {
        const g = genererMotif(params, creerAlea(graine));
        assert.ok(g !== null);
        assert.ok(estSymetrique(g) && estConnexe(g));
        assert.deepEqual(casesIsolees(g), []);
        assert.ok(g.emplacements.every((e) => e.cellules.length >= 2 && e.cellules.length <= params.longueurMax));
      }
    }
  });

  test('remplissage : nombres tous différents, aucun ne commence par 0', () => {
    const params = PARAMETRES_NIVEAUX.expert;
    for (let graine = 1; graine <= 20; graine++) {
      const alea = creerAlea(graine);
      const g = genererMotif(params, alea);
      assert.ok(g !== null);
      const chiffres = remplir(g, params, alea);
      assert.ok(chiffres !== null);
      const nombres = g.emplacements.map((e) => nombreDe(e, chiffres));
      assert.equal(new Set(nombres).size, nombres.length);
      assert.ok(nombres.every((t) => !t.startsWith('0')));
    }
  });
});
