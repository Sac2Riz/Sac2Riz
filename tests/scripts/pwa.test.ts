// Tests des scripts de la PWA : encodeur PNG et dessin des icônes, manifeste du service worker
// (liste des fichiers, version, injection dans le fichier compilé).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { crc32, inflateSync } from 'node:zlib';
import { genererIcones } from '../../scripts/generer-icones.ts';
import { contient, formesIcone, iconeSvg, rendre } from '../../scripts/icones/dessin.ts';
import { encoderPng, SIGNATURE_PNG } from '../../scripts/icones/png.ts';
import { construireManifeste, ecrireManifeste, injecterManifeste } from '../../scripts/manifeste-precache.ts';
import { estManifestePrecache } from '../../src/types/service-worker.ts';

const temporaires: string[] = [];
function dossierTemporaire(): string {
  const d = mkdtempSync(join(tmpdir(), 'sac2riz-test-'));
  temporaires.push(d);
  return d;
}
after(() => {
  for (const d of temporaires) rmSync(d, { recursive: true, force: true });
});

function ecrire(dossier: string, chemin: string, contenu: string): void {
  const complet = join(dossier, chemin);
  mkdirSync(dirname(complet), { recursive: true });
  writeFileSync(complet, contenu);
}

/** Relit les blocs d'un PNG en vérifiant leur CRC. */
function lirePng(png: Buffer): { largeur: number; hauteur: number; pixels: Buffer } {
  assert.deepEqual(png.subarray(0, 8), SIGNATURE_PNG);
  let position = 8;
  let largeur = 0;
  let hauteur = 0;
  const idat: Buffer[] = [];
  const types: string[] = [];
  while (position < png.length) {
    const longueur = png.readUInt32BE(position);
    const type = png.toString('ascii', position + 4, position + 8);
    const donnees = png.subarray(position + 8, position + 8 + longueur);
    assert.equal(png.readUInt32BE(position + 8 + longueur), crc32(png.subarray(position + 4, position + 8 + longueur)));
    types.push(type);
    if (type === 'IHDR') {
      largeur = donnees.readUInt32BE(0);
      hauteur = donnees.readUInt32BE(4);
      assert.equal(donnees[8], 8);
      assert.equal(donnees[9], 6);
    }
    if (type === 'IDAT') idat.push(donnees);
    position += 12 + longueur;
  }
  assert.deepEqual(types, ['IHDR', 'IDAT', 'IEND']);
  return { largeur, hauteur, pixels: inflateSync(Buffer.concat(idat)) };
}

describe('icônes', () => {
  test('encodeur PNG : fichier valide, pixels relus à l\'identique', () => {
    const pixels = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 10, 20, 30, 40, 1, 2, 3, 4, 5, 6, 7, 8]);
    const { largeur, hauteur, pixels: brut } = lirePng(encoderPng(3, 2, pixels));
    assert.equal(largeur, 3);
    assert.equal(hauteur, 2);
    // Chaque ligne : un octet de filtre (0) puis les pixels
    assert.deepEqual([...brut], [0, ...pixels.subarray(0, 12), 0, ...pixels.subarray(12)]);
  });

  test('encodeur PNG : taille incohérente refusée', () => {
    assert.throws(() => encoderPng(2, 2, new Uint8Array(4)));
  });

  test('rectangle à coins arrondis : intérieur, bords, coins', () => {
    const f = { x: 0, y: 0, l: 100, h: 100, r: 20, couleur: '#000000' };
    assert.ok(contient(f, 50, 50));
    assert.ok(contient(f, 0, 50));
    assert.ok(!contient(f, 2, 2)); // dans le coin arrondi
    assert.ok(contient(f, 20, 20));
    assert.ok(!contient(f, 101, 50));
  });

  test('icône « any » : coins transparents ; « maskable » : pleine sur tout le carré', () => {
    const any = rendre(formesIcone(false), 64);
    const maskable = rendre(formesIcone(true), 64);
    assert.equal(any[3], 0);
    assert.equal(maskable[3], 255);
    assert.equal(maskable[(64 * 64 - 1) * 4 + 3], 255);
  });

  test('genererIcones écrit le SVG et les trois PNG aux bonnes tailles', () => {
    const dossier = dossierTemporaire();
    const fichiers = genererIcones(dossier);
    assert.deepEqual(fichiers, ['icone.svg', 'icone-192.png', 'icone-512.png', 'icone-maskable-512.png']);
    assert.equal(readFileSync(join(dossier, 'icone.svg'), 'utf8'), iconeSvg());
    assert.equal(lirePng(readFileSync(join(dossier, 'icone-192.png'))).largeur, 192);
    assert.equal(lirePng(readFileSync(join(dossier, 'icone-maskable-512.png'))).hauteur, 512);
  });
});

describe('manifeste du service worker', () => {
  const SOURCE = 'const MANIFESTE_TEXTE = \'__MANIFESTE_PRECACHE__\';\nconsole.log(MANIFESTE_TEXTE);\n';

  function distExemple(): string {
    const dist = dossierTemporaire();
    ecrire(dist, 'index.html', '<!doctype html>');
    ecrire(dist, 'main.js', 'console.log(1);');
    ecrire(dist, 'main.js.map', '{}');
    ecrire(dist, 'games/jeu-a/packs/expert.json', '{"grilles":[]}');
    ecrire(dist, 'service-worker.js', SOURCE);
    return dist;
  }

  test('liste : tous les fichiers sauf les .map et le service worker, triés, avec des « / »', () => {
    const m = construireManifeste(distExemple());
    assert.deepEqual(m.fichiers, ['games/jeu-a/packs/expert.json', 'index.html', 'main.js']);
    assert.match(m.version, /^[0-9a-f]{12}$/);
  });

  test('version : identique pour un contenu identique, différente dès qu\'un fichier change', () => {
    const a = distExemple();
    const b = distExemple();
    assert.equal(construireManifeste(a).version, construireManifeste(b).version);
    ecrire(b, 'games/jeu-a/packs/expert.json', '{"grilles":[1]}');
    assert.notEqual(construireManifeste(a).version, construireManifeste(b).version);
    // Une carte de source ne compte pas
    ecrire(a, 'main.js.map', '{"autre":true}');
    assert.equal(construireManifeste(a).version, construireManifeste(distExemple()).version);
  });

  test('injection : le marqueur devient un texte JSON relisible', () => {
    const manifeste = { version: 'abc123', fichiers: ['index.html', 'a$b.js'] };
    const resultat = injecterManifeste(SOURCE, manifeste);
    const texte = /const MANIFESTE_TEXTE = (".*");/.exec(resultat)?.[1];
    assert.ok(texte !== undefined);
    const relu: unknown = JSON.parse(JSON.parse(texte));
    assert.ok(estManifestePrecache(relu));
    assert.deepEqual(relu, manifeste);
  });

  test('injection : marqueur absent ou en double refusé', () => {
    const m = { version: 'v', fichiers: [] };
    assert.throws(() => injecterManifeste('rien', m), /0 fois/);
    assert.throws(() => injecterManifeste(SOURCE + SOURCE, m), /2 fois/);
    assert.throws(() => injecterManifeste(injecterManifeste(SOURCE, m), m), /0 fois/);
  });

  test('ecrireManifeste : réécrit le service worker du dossier', () => {
    const dist = distExemple();
    const m = ecrireManifeste(dist);
    assert.ok(readFileSync(join(dist, 'service-worker.js'), 'utf8').includes(m.version));
  });

  test('garde du manifeste', () => {
    assert.ok(estManifestePrecache({ version: 'v1', fichiers: ['a'] }));
    assert.equal(estManifestePrecache({ version: '', fichiers: [] }), false);
    assert.equal(estManifestePrecache({ version: 'v', fichiers: [''] }), false);
    assert.equal(estManifestePrecache('__MANIFESTE_PRECACHE__'), false);
  });
});
