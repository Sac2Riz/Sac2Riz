// TEST LONG des packs du Tectonic (« npm run test:long ») : chaque grille des packs embarqués a une
// solution unique (backtracking du moteur) et la notation recalculée est identique à celle stockée ;
// les premières graines redonnent les mêmes grilles (reproductibilité).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compterSolutionsAvec } from '../../../src/moteur/backtracking.ts';
import { genererTectonic } from '../../../src/games/tectonic/generateur.ts';
import { structureDe } from '../../../src/games/tectonic/grille.ts';
import { logique } from '../../../src/games/tectonic/logique.ts';
import { convertirPack, donneesEnTextes, estPackTectonic, NIVEAUX_AVEC_PACK } from '../../../src/games/tectonic/packs.ts';
import { creerAlea } from '../../../src/utils/alea.ts';
import { lirePack } from './aide.ts';

for (const niveau of NIVEAUX_AVEC_PACK) {
  describe(`Tectonic : pack ${niveau} (test long)`, () => {
    const contenu = lirePack(niveau);

    test('chaque grille : solution unique, notation identique', () => {
      assert.ok(estPackTectonic(contenu));
      for (const { graine, donnees, notation } of convertirPack(contenu)) {
        const r = compterSolutionsAvec(structureDe(donnees).contexte.structure, donnees.enonce, { limite: 2 });
        assert.equal(r.nombre, 1, `graine ${graine} : solution non unique`);
        assert.deepEqual(logique.noter(donnees), notation, `graine ${graine} : notation différente`);
      }
    });

    test('reproductible : les premières graines redonnent les mêmes grilles', () => {
      assert.ok(estPackTectonic(contenu));
      for (const g of contenu.grilles.slice(0, 2)) {
        const r = genererTectonic(niveau, creerAlea(g.graine), { tentativesMax: 1000 });
        assert.ok(r.ok);
        const { zones, solution, enonce } = donneesEnTextes(r.donnees);
        assert.deepEqual({ zones, solution, enonce }, { zones: g.zones, solution: g.solution, enonce: g.enonce });
      }
    });
  });
}
