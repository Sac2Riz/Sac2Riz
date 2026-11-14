// Tests des packs du Tectonic : format texte, garde (packs corrompus refusés), packs embarqués
// (forme, version de notation, 200 grilles différentes, échantillon re-noté).
// La vérification complète (unicité, notation des 600 grilles, reproductibilité) est dans packs.long.ts.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { logique } from '../../../src/games/tectonic/logique.ts';
import { META } from '../../../src/games/tectonic/meta.ts';
import { VERSION_NOTATION_TECTONIC } from '../../../src/games/tectonic/notation.ts';
import {
  convertirPack,
  donneesEnTextes,
  estPackTectonic,
  NIVEAUX_AVEC_PACK,
  textesEnDonnees,
  VERSION_FORMAT_PACK_TECTONIC,
} from '../../../src/games/tectonic/packs.ts';
import { DEBUTANT, lirePack, NOMBRE_GRILLES_PACK } from './aide.ts';

describe('Tectonic : format des packs', () => {
  test('donneesEnTextes / textesEnDonnees : aller-retour sans perte', () => {
    const textes = donneesEnTextes(DEBUTANT);
    assert.equal(textes.zones.split('/').length, DEBUTANT.lignes);
    assert.deepEqual(textesEnDonnees(textes), DEBUTANT);
    assert.equal(textesEnDonnees({ ...textes, solution: '12/3' }), null, 'dimensions différentes');
    assert.equal(textesEnDonnees({ ...textes, enonce: textes.enonce.replace('.', 'x') }), null, 'caractère inconnu');
  });

  test('chaque niveau réalimenté avec un budget long a un pack', () => {
    for (const niveau of Object.keys(META.generation)) assert.ok(NIVEAUX_AVEC_PACK.some((n) => n === niveau), niveau);
  });
});

describe('Tectonic : estPackTectonic refuse les packs corrompus', () => {
  // Grille Débutant avec une notation Difficile inventée : la garde vérifie la cohérence, pas l'exactitude
  const grille = {
    graine: 1,
    ...donneesEnTextes(DEBUTANT),
    notation: { niveau: 'difficile', force: 7, techniqueMax: 'triplet-nu', details: { 'triplet-nu': 1, 'singleton-nu': 3 } },
  };
  const pack = { version: VERSION_FORMAT_PACK_TECTONIC, versionNotation: VERSION_NOTATION_TECTONIC, jeu: META.id, niveau: 'difficile', grilles: [grille] };
  const avecGrille = (modif: object): object => ({ ...pack, grilles: [{ ...grille, ...modif }] });
  const avecNotation = (modif: object): object => avecGrille({ notation: { ...grille.notation, ...modif } });

  test('le pack de référence est accepté', () => assert.ok(estPackTectonic(pack)));

  const cas: readonly (readonly [string, unknown])[] = [
    ['valeur non objet', 'pack'],
    ['autre version de format', { ...pack, version: VERSION_FORMAT_PACK_TECTONIC + 1 }],
    ['autre version de notation', { ...pack, versionNotation: VERSION_NOTATION_TECTONIC + 1 }],
    ['autre jeu', { ...pack, jeu: 'sudoku-classique' }],
    ['aucune grille', { ...pack, grilles: [] }],
    ['graine négative', avecGrille({ graine: -1 })],
    ['solution fausse', avecGrille({ solution: grille.solution.replace(/[0-9]/g, '1'), enonce: grille.enonce.replace(/[0-9]/g, '.') })],
    ['zones mal formées', avecGrille({ zones: grille.zones.toUpperCase().replace(/[0-9]/g, 'Z') })],
    ["notation d'un autre niveau", avecNotation({ niveau: 'moyen' })],
    ['force hors de la plage du niveau', avecNotation({ force: 9 })],
    ["technique max d'un autre niveau", avecNotation({ techniqueMax: 'paire-nue', details: { 'paire-nue': 1 } })],
    ['technique inconnue', avecNotation({ details: { 'triplet-nu': 1, inconnue: 1 } })],
    ['technique plus dure que le niveau', avecNotation({ details: { 'triplet-nu': 1, 'x-chain': 1 } })],
  ];
  for (const [nom, valeur] of cas) test(`refusé : ${nom}`, () => assert.equal(estPackTectonic(valeur), false));
});

for (const niveau of NIVEAUX_AVEC_PACK) {
  describe(`Tectonic : pack ${niveau} embarqué`, () => {
    const contenu = lirePack(niveau);

    test('passe la garde, à la version de notation actuelle, 200 grilles toutes différentes', () => {
      assert.ok(estPackTectonic(contenu), 'pack invalide (à régénérer : npm run packs -- --jeu=tectonic ?)');
      assert.equal(contenu.niveau, niveau);
      assert.equal(contenu.grilles.length, NOMBRE_GRILLES_PACK);
      assert.equal(new Set(contenu.grilles.map((g) => g.graine)).size, NOMBRE_GRILLES_PACK);
      assert.equal(new Set(contenu.grilles.map((g) => g.zones + g.enonce)).size, NOMBRE_GRILLES_PACK);
    });

    test("converti en grilles jouables ; échantillon re-noté à l'identique", () => {
      assert.ok(estPackTectonic(contenu));
      const puzzles = convertirPack(contenu);
      assert.equal(puzzles.length, NOMBRE_GRILLES_PACK);
      for (const puzzle of puzzles.slice(0, 3)) {
        assert.equal(puzzle.jeu, META.id);
        assert.ok(logique.estDonnees(puzzle.donnees));
        assert.deepEqual(logique.noter(puzzle.donnees), puzzle.notation, `graine ${puzzle.graine}`);
      }
    });
  });
}
