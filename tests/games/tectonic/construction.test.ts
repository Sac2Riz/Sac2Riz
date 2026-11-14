import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { construireGrille } from '../../../src/games/tectonic/construction.ts';
import { respecteLesRegles } from '../../../src/games/tectonic/gardes.ts';
import { parametresGrille } from '../../../src/games/tectonic/generateur.ts';
import { cellulesDesZones, estNumerotee, zonesConnexes } from '../../../src/games/tectonic/geometrie.ts';
import { creerAlea } from '../../../src/utils/alea.ts';

describe('Tectonic : construction des zones et des chiffres', () => {
  for (const [cote, tailleMax] of [[6, 5], [8, 5], [7, 6]] as const) {
    test(`${cote}×${cote}, zones ≤ ${tailleMax} : grilles pleines valides`, () => {
      const p = Object.freeze({ ...parametresGrille(cote, tailleMax, null), noeudsMax: 20_000 });
      const alea = creerAlea(5);
      let reussies = 0;
      for (let i = 0; i < 60 && reussies < 10; i++) {
        const g = construireGrille(p, alea);
        if (g === null) continue;
        reussies++;
        assert.equal(g.zones.length, cote * cote);
        assert.ok(estNumerotee(g.zones));
        assert.ok(zonesConnexes(cote, cote, g.zones));
        const tailles = cellulesDesZones(g.zones).map((z) => z.length);
        assert.ok(tailles.every((t) => t >= 1 && t <= tailleMax));
        assert.ok(tailles.filter((t) => t === 1).length <= p.unitairesMax);
        assert.ok(respecteLesRegles(cote, cote, g.zones, g.solution));
      }
      assert.ok(reussies >= 5, `trop peu de grilles réussies : ${reussies}`);
    });
  }

  test('même graine → même grille', () => {
    const p = parametresGrille(6, 5, null);
    const essayer = (): unknown => {
      const alea = creerAlea(42);
      for (;;) {
        const g = construireGrille(p, alea);
        if (g !== null) return g;
      }
    };
    assert.deepEqual(essayer(), essayer());
  });
});
