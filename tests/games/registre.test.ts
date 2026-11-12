// Tests du registre : chaque jeu enregistré respecte les conventions et le contrat.
// Un nouveau jeu ajouté au registre est donc testé automatiquement.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { REGISTRE } from '../../src/games/registre.ts';
import { verifierModule } from './verifier-module.ts';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('registre des jeux', () => {
  test('identifiants uniques, en kebab-case, sans « _ » (réservé aux modules non publiés)', () => {
    const ids = REGISTRE.map((entree) => entree.id);
    assert.equal(new Set(ids).size, ids.length, 'identifiant en double');
    for (const id of ids) assert.match(id, KEBAB_CASE);
  });

  for (const entree of REGISTRE) {
    test(`le jeu « ${entree.id} » respecte le contrat`, async () => {
      const { jeu } = await entree.charger();
      await verifierModule(entree.id, jeu);
    });
  }
});
