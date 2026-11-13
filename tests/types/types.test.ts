// Tests des types partagés.
// La première partie est vérifiée À LA COMPILATION (npm run typecheck) : si un type
// de sauvegarde cessait d'être sérialisable en JSON, tsc refuserait ce fichier.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Json } from '../../src/types/json.ts';
import { INFOS_NIVEAUX, NIVEAUX, estNiveau, niveauPourForce, type Force } from '../../src/types/niveaux.ts';
import { REGLAGES_PAR_DEFAUT, type FichierExport } from '../../src/types/sauvegarde.ts';

const statsVides = { terminees: 0, abandonnees: 0, meilleurTempsMs: null, totalTempsMs: 0, totalForce: 0 };

const exemple: FichierExport = {
  format: 'sac2riz-export',
  version: 1,
  exporteLe: '2026-01-01T00:00:00.000Z',
  reglages: REGLAGES_PAR_DEFAUT,
  parties: [],
  stats: {
    'jeu-exemple': {
      debutant: statsVides, facile: statsVides, moyen: statsVides,
      difficile: statsVides, expert: statsVides, diabolique: statsVides,
    },
  },
};

// Vérification à la compilation : FichierExport est bien du JSON
const commeJson: Json = exemple;

describe('types partagés', () => {
  test('un fichier d\'export survit à un aller-retour JSON', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(commeJson)), exemple);
  });

  test('les plages de force des 6 niveaux couvrent 1 à 10 sans trou ni chevauchement', () => {
    let attendue = 1;
    for (const niveau of NIVEAUX) {
      const infos = INFOS_NIVEAUX[niveau];
      assert.equal(infos.forceMin, attendue, `début de plage de ${niveau}`);
      attendue = infos.forceMax + 1;
    }
    assert.equal(attendue, 11);
  });

  test('niveauPourForce est cohérent avec les plages', () => {
    for (let f = 1; f <= 10; f++) {
      const force = f as Force; // f parcourt exactement 1..10
      const niveau = niveauPourForce(force);
      assert.ok(force >= INFOS_NIVEAUX[niveau].forceMin && force <= INFOS_NIVEAUX[niveau].forceMax);
    }
  });

  test('estNiveau reconnaît les 6 niveaux et rien d\'autre', () => {
    for (const niveau of NIVEAUX) assert.ok(estNiveau(niveau));
    for (const intrus of ['', 'Expert', 'facile ', 3, null]) assert.equal(estNiveau(intrus), false);
  });
});
