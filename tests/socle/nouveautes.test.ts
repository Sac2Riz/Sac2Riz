// Tests des nouveautés montrées avant une mise à jour : fichier public/nouveautes.json, choix des
// nouveautés à montrer, lecture de la nouvelle version dans le cache (faux cache sous Node).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { lireInfosMiseAJour, nouveautesDepuis, type LecteurCaches } from '../../src/socle/pwa/infos-mise-a-jour.ts';
import { estFichierNouveautes, type FichierNouveautes, type GroupeNouveautes } from '../../src/types/nouveautes.ts';

const BASE = 'https://exemple.test/Sac2Riz/index.html';
const URL_VERSION = 'https://exemple.test/Sac2Riz/version.json';
const URL_NOUVEAUTES = 'https://exemple.test/Sac2Riz/nouveautes.json';

const groupe = (id: string, date = '2026-11-14'): GroupeNouveautes => ({ id, date, titre: `Titre ${id}`, nouveautes: [`Nouveauté ${id}`] });
const fichier = (...ids: string[]): FichierNouveautes => ({ versions: ids.map((id) => groupe(id)) });

/** Faux Cache Storage : contenu JSON par cache et par URL. */
function fauxCaches(contenu: Record<string, Record<string, unknown>>): LecteurCaches {
  return {
    noms: async () => Object.keys(contenu),
    lireJson: async (cache, url) => contenu[cache]?.[url] ?? null,
  };
}

const ACTUELLE = { version: 'aaaaaaaaaaaa', date: '2026-11-14T10:00:00.000Z' };
const NOUVELLE = { version: 'bbbbbbbbbbbb', date: '2026-11-15T08:30:00.000Z' };

describe('fichier des nouveautés (public/nouveautes.json)', () => {
  const lu: unknown = JSON.parse(readFileSync(new URL('../../public/nouveautes.json', import.meta.url), 'utf8'));

  test('format valide, identifiants uniques, du plus récent au plus ancien', () => {
    assert.ok(estFichierNouveautes(lu));
    const ids = lu.versions.map((g) => g.id);
    assert.equal(new Set(ids).size, ids.length, 'identifiant en double');
    for (let i = 1; i < lu.versions.length; i++) {
      assert.ok((lu.versions[i - 1]?.date ?? '') >= (lu.versions[i]?.date ?? ''), 'ordre : du plus récent au plus ancien');
    }
  });

  test('rédigé pour le joueur : pas de vocabulaire technique', () => {
    assert.ok(estFichierNouveautes(lu));
    const texte = lu.versions.flatMap((g) => [g.titre, ...g.nouveautes]).join(' ');
    assert.doesNotMatch(texte, /IndexedDB|service worker|cache|worker|commit|JSON|\.ts\b|npm|CSS/i);
  });

  test('garde : groupes complets uniquement', () => {
    assert.ok(estFichierNouveautes({ versions: [] }));
    assert.equal(estFichierNouveautes({ versions: [{ ...groupe('a'), nouveautes: [] }] }), false, 'groupe vide');
    assert.equal(estFichierNouveautes({ versions: [{ ...groupe('a'), date: '14/11/2026' }] }), false);
    assert.equal(estFichierNouveautes({ versions: [{ ...groupe('a'), titre: ' ' }] }), false);
    assert.equal(estFichierNouveautes([]), false);
    assert.equal(estFichierNouveautes(null), false);
  });
});

describe('nouveautés à montrer', () => {
  test('seulement les groupes que la version installée n\'avait pas, du plus récent au plus ancien', () => {
    assert.deepEqual(nouveautesDepuis(fichier('c', 'b', 'a'), fichier('a')).map((g) => g.id), ['c', 'b']);
  });

  test('version sans nouveauté visible : rien', () => {
    assert.deepEqual(nouveautesDepuis(fichier('b', 'a'), fichier('b', 'a')), []);
  });

  test('version installée sans fichier : tout', () => {
    assert.deepEqual(nouveautesDepuis(fichier('b', 'a'), null).map((g) => g.id), ['b', 'a']);
  });
});

describe('lecture de la nouvelle version (déjà téléchargée, dans son cache)', () => {
  test('versions installée et nouvelle, nouveautés depuis la version installée', async () => {
    const infos = await lireInfosMiseAJour({
      caches: fauxCaches({
        'sac2riz-aaaaaaaaaaaa': { [URL_VERSION]: ACTUELLE, [URL_NOUVEAUTES]: fichier('a') },
        'sac2riz-bbbbbbbbbbbb': { [URL_VERSION]: NOUVELLE, [URL_NOUVEAUTES]: fichier('c', 'b', 'a') },
        'autre-site': { [URL_VERSION]: { version: 'zzz', date: '2030-01-01T00:00:00.000Z' } },
      }),
      base: BASE,
      actuelle: ACTUELLE,
      nouveautesActuelles: fichier('a'),
    });
    assert.deepEqual(infos.actuelle, ACTUELLE);
    assert.deepEqual(infos.nouvelle, NOUVELLE);
    assert.deepEqual(infos.nouveautes.map((g) => g.id), ['c', 'b']);
  });

  test('plusieurs caches en trop : la version la plus récente ; fichiers invalides ignorés', async () => {
    const plusRecente = { version: 'cccccccccccc', date: '2026-11-16T00:00:00.000Z' };
    const infos = await lireInfosMiseAJour({
      caches: fauxCaches({
        'sac2riz-aaaaaaaaaaaa': { [URL_VERSION]: ACTUELLE },
        'sac2riz-bbbbbbbbbbbb': { [URL_VERSION]: NOUVELLE, [URL_NOUVEAUTES]: fichier('b') },
        'sac2riz-cccccccccccc': { [URL_VERSION]: plusRecente, [URL_NOUVEAUTES]: { abime: true } },
        'sac2riz-dddddddddddd': { [URL_VERSION]: { version: '' } },
      }),
      base: BASE,
      actuelle: ACTUELLE,
      nouveautesActuelles: null,
    });
    assert.deepEqual(infos.nouvelle, plusRecente);
    assert.deepEqual(infos.nouveautes, [], 'fichier des nouveautés illisible : rien de particulier');
  });

  test('nouvelle version introuvable ou cache inaccessible : pas de date, pas de nouveauté', async () => {
    const seule = await lireInfosMiseAJour({
      caches: fauxCaches({ 'sac2riz-aaaaaaaaaaaa': { [URL_VERSION]: ACTUELLE } }),
      base: BASE,
      actuelle: ACTUELLE,
      nouveautesActuelles: null,
    });
    assert.deepEqual(seule, { actuelle: ACTUELLE, nouvelle: null, nouveautes: [] });
    const enPanne: LecteurCaches = { noms: () => Promise.reject(new Error('refusé')), lireJson: async () => null };
    assert.deepEqual(await lireInfosMiseAJour({ caches: enPanne, base: BASE, actuelle: null, nouveautesActuelles: null }), {
      actuelle: null,
      nouvelle: null,
      nouveautes: [],
    });
  });
});
