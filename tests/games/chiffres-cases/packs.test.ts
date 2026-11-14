// Tests des packs des chiffres casés : garde (packs corrompus refusés), conversion, packs embarqués
// (forme, version de notation, taille, grilles toutes différentes, échantillon re-noté).
// La vérification complète (unicité et notation des 400 grilles, reproductibilité) est dans packs.long.ts.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { logique } from '../../../src/games/chiffres-cases/logique.ts';
import { META } from '../../../src/games/chiffres-cases/meta.ts';
import { VERSION_NOTATION_CASES } from '../../../src/games/chiffres-cases/notation.ts';
import {
  convertirPack,
  donneesEnTexte,
  estPackCases,
  NIVEAUX_AVEC_PACK,
  texteEnDonnees,
  VERSION_FORMAT_PACK_CASES,
} from '../../../src/games/chiffres-cases/packs.ts';
import { donneesDe, GRILLE_A, H1, lirePack, NOMBRE_GRILLES_PACK } from './aide.ts';

describe('chiffres casés : format des packs', () => {
  test('donneesEnTexte / texteEnDonnees : aller-retour sans perte', () => {
    const donnees = donneesDe(GRILLE_A, [H1]);
    assert.equal(donneesEnTexte(donnees), '123/4#5/678');
    assert.deepEqual(texteEnDonnees('123/4#5/678', [H1]), donnees);
    assert.equal(texteEnDonnees('123/45/678', []), null, 'lignes de longueurs différentes');
    assert.equal(texteEnDonnees('123/4x5/678', []), null, 'caractère inconnu');
  });

  test('tout niveau servi uniquement par son pack a bien un pack', () => {
    for (const [niveau, reglage] of Object.entries(META.generation)) {
      if (reglage.mode === 'pack') assert.ok(NIVEAUX_AVEC_PACK.some((n) => n === niveau), niveau);
    }
  });
});

describe('chiffres casés : estPackCases refuse les packs corrompus', () => {
  // Grille A avec une notation Expert inventée : la garde vérifie la cohérence, pas l'exactitude
  const grille = {
    graine: 1,
    grille: '123/4#5/678',
    preplaces: [H1],
    notation: { niveau: 'expert', force: 9, techniqueMax: 'croisement-complet', details: { 'croisement-complet': 1, 'motif-unique': 3 } },
  };
  const pack = { version: VERSION_FORMAT_PACK_CASES, versionNotation: VERSION_NOTATION_CASES, jeu: META.id, niveau: 'expert', grilles: [grille] };
  const avecGrille = (modif: object): object => ({ ...pack, grilles: [{ ...grille, ...modif }] });
  const avecNotation = (modif: object): object => avecGrille({ notation: { ...grille.notation, ...modif } });

  test('le pack de référence est accepté', () => {
    assert.ok(estPackCases(pack));
  });

  const cas: readonly (readonly [string, unknown])[] = [
    ['valeur non objet', 'pack'],
    ['autre version de format', { ...pack, version: VERSION_FORMAT_PACK_CASES + 1 }],
    ['autre version de notation', { ...pack, versionNotation: VERSION_NOTATION_CASES + 1 }],
    ['autre jeu', { ...pack, jeu: 'sudoku-classique' }],
    ['niveau inconnu', { ...pack, niveau: 'impossible' }],
    ['aucune grille', { ...pack, grilles: [] }],
    ['graine négative', avecGrille({ graine: -1 })],
    ['grille non rectangulaire', avecGrille({ grille: '123/45/678' })],
    ['nombre commençant par 0', avecGrille({ grille: '023/4#5/678' })],
    ['case blanche isolée', avecGrille({ grille: '1#3/###/678' })],
    ['pré-placé inexistant', avecGrille({ preplaces: [99] })],
    ['notation d\'un autre niveau', avecNotation({ niveau: 'moyen' })],
    ['force hors de la plage du niveau', avecNotation({ force: 10 })],
    ['technique max d\'un autre niveau', avecNotation({ techniqueMax: 'croisement', details: { croisement: 1 } })],
    ['technique inconnue', avecNotation({ details: { 'croisement-complet': 1, inconnue: 1 } })],
    ['technique plus dure que le niveau', avecNotation({ details: { 'croisement-complet': 1, forcing: 1 } })],
  ];
  for (const [nom, valeur] of cas) {
    test(`refusé : ${nom}`, () => assert.equal(estPackCases(valeur), false));
  }
});

for (const niveau of NIVEAUX_AVEC_PACK) {
  describe(`chiffres casés : pack ${niveau} embarqué`, () => {
    const contenu = lirePack(niveau);

    test('passe la garde, à la version de notation actuelle, 200 grilles toutes différentes', () => {
      assert.ok(estPackCases(contenu), 'pack invalide (à régénérer : npm run packs -- --jeu=chiffres-cases ?)');
      assert.equal(contenu.niveau, niveau);
      assert.equal(contenu.grilles.length, NOMBRE_GRILLES_PACK);
      assert.equal(new Set(contenu.grilles.map((g) => g.graine)).size, NOMBRE_GRILLES_PACK);
      assert.equal(new Set(contenu.grilles.map((g) => g.grille)).size, NOMBRE_GRILLES_PACK);
    });

    test('converti en grilles jouables ; échantillon re-noté à l\'identique', () => {
      assert.ok(estPackCases(contenu));
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
