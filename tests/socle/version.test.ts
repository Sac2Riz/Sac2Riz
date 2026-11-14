// Tests de la version affichée dans les réglages (date du build et empreinte).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { formaterDateBuild, lireVersion, texteVersion } from '../../src/socle/pwa/version.ts';
import { estInfosVersion } from '../../src/types/service-worker.ts';

describe('version de l\'appli', () => {
  test('date locale « JJ/MM/AAAA HH:MM »', () => {
    assert.equal(formaterDateBuild(new Date(2026, 10, 14, 17, 30, 59)), '14/11/2026 17:30');
    assert.equal(formaterDateBuild(new Date(2027, 0, 5, 8, 4)), '05/01/2027 08:04');
  });

  test('texte : date et heure du build, puis le début de l\'empreinte', () => {
    const date = new Date(2026, 10, 14, 17, 30).toISOString();
    assert.equal(texteVersion({ version: 'a1b2c3d4e5f6', date }), '14/11/2026 17:30 · a1b2c3d4');
    assert.equal(texteVersion(null), 'Développement');
  });

  test('lecture de version.json : contenu vérifié, absence tolérée', async () => {
    const base = 'https://exemple.test/Sac2Riz/index.html';
    const infos = { version: 'a1b2c3d4e5f6', date: '2026-11-14T16:30:00.000Z' };
    let demandee = '';
    const lue = await lireVersion(async (url) => {
      demandee = url.href;
      return infos;
    }, base);
    assert.deepEqual(lue, infos);
    assert.equal(demandee, 'https://exemple.test/Sac2Riz/version.json');
    assert.equal(await lireVersion(async () => ({ version: 'x' }), base), null);
    assert.equal(await lireVersion(() => Promise.reject(new Error('hors ligne')), base), null);
  });

  test('garde des infos de version', () => {
    assert.ok(estInfosVersion({ version: 'v', date: '2026-11-14T16:30:00.000Z' }));
    assert.equal(estInfosVersion({ version: '', date: '2026-11-14T16:30:00.000Z' }), false);
    assert.equal(estInfosVersion({ version: 'v', date: 'hier' }), false);
    assert.equal(estInfosVersion(null), false);
  });
});
