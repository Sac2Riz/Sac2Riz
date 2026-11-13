// Tests des réglages : complétion des réglages enregistrés par l'étape 3b, relecture par le stockage.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { completerReglages } from '../../src/socle/reglages.ts';
import { creerStockageMemoire } from '../../src/socle/stockage/memoire.ts';
import { CLE_REGLAGES } from '../../src/socle/stockage/stockage.ts';
import { REGLAGES_PAR_DEFAUT, type Reglages } from '../../src/types/sauvegarde.ts';
import { estReglages } from '../../src/utils/gardes-sauvegarde.ts';

describe('réglages', () => {
  test('aucun réglage enregistré : valeurs par défaut', () => {
    assert.deepEqual(completerReglages(null), REGLAGES_PAR_DEFAUT);
    assert.deepEqual(REGLAGES_PAR_DEFAUT, {
      theme: 'systeme',
      verifierErreurs: false,
      miseEnEvidence: true,
      retraitAutoNotes: true,
    });
  });

  test("réglages de l'étape 3b : thème et vérification conservés, nouveaux réglages par défaut", async () => {
    const stockage = creerStockageMemoire();
    await stockage.ecrire('reglages', CLE_REGLAGES, { theme: 'sombre', verifierErreurs: true });
    const reglages = completerReglages(await stockage.lire('reglages', CLE_REGLAGES));
    assert.deepEqual(reglages, { theme: 'sombre', verifierErreurs: true, miseEnEvidence: true, retraitAutoNotes: true });
    assert.ok(estReglages(reglages));
  });

  test('réglages complets : relus tels quels', async () => {
    const stockage = creerStockageMemoire();
    const choisis: Reglages = { theme: 'clair', verifierErreurs: true, miseEnEvidence: false, retraitAutoNotes: false };
    await stockage.ecrire('reglages', CLE_REGLAGES, choisis);
    assert.deepEqual(completerReglages(await stockage.lire('reglages', CLE_REGLAGES)), choisis);
  });
});
