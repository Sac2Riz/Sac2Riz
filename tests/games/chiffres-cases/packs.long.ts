// TEST LONG des packs des chiffres casés (« npm run test:long ») : chaque grille des packs embarqués
// a une solution unique (backtracking) et la notation recalculée est identique à celle stockée ;
// les premières graines redonnent les mêmes grilles (reproductibilité).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compterSolutions } from '../../../src/games/chiffres-cases/backtracking.ts';
import { genererCases } from '../../../src/games/chiffres-cases/generateur.ts';
import { logique } from '../../../src/games/chiffres-cases/logique.ts';
import { convertirPack, donneesEnTexte, estPackCases, NIVEAUX_AVEC_PACK } from '../../../src/games/chiffres-cases/packs.ts';
import { structureDe } from '../../../src/games/chiffres-cases/probleme.ts';
import { etatDepart } from '../../../src/games/chiffres-cases/solveur/etat.ts';
import { creerAlea } from '../../../src/utils/alea.ts';
import { lirePack } from './aide.ts';

for (const niveau of NIVEAUX_AVEC_PACK) {
  describe(`chiffres casés : pack ${niveau} (test long)`, () => {
    const contenu = lirePack(niveau);

    test('chaque grille : solution unique, notation identique', () => {
      assert.ok(estPackCases(contenu));
      for (const { graine, donnees, notation } of convertirPack(contenu)) {
        const { probleme: p, solution } = structureDe(donnees);
        const donnes = donnees.preplaces.map((emplacement) => ({ emplacement, nombre: solution[emplacement] ?? -1 }));
        assert.equal(compterSolutions(p, etatDepart(p, donnes)).nombre, 1, `graine ${graine} : solution non unique`);
        assert.deepEqual(logique.noter(donnees), notation, `graine ${graine} : notation différente`);
      }
    });

    test('reproductible : les premières graines redonnent les mêmes grilles', () => {
      assert.ok(estPackCases(contenu));
      for (const g of contenu.grilles.slice(0, 2)) {
        const r = genererCases(niveau, creerAlea(g.graine), { tentativesMax: 1000 });
        assert.ok(r.ok);
        assert.equal(donneesEnTexte(r.donnees), g.grille);
        assert.deepEqual(r.donnees.preplaces, g.preplaces);
      }
    });
  });
}
