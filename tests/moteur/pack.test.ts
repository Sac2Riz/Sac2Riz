// Tests des packs : garde de validation (packs corrompus refusés) et contenu des packs embarqués
// (forme, version de notation, unicité, notation identique à celle recalculée, reproductibilité).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { estUnique } from '../../src/moteur/backtracking.ts';
import { genererParNiveau } from '../../src/moteur/generation-niveau.ts';
import { creerContexte } from '../../src/moteur/logique/contexte.ts';
import { noterGrille, VERSION_NOTATION } from '../../src/moteur/notation.ts';
import { estPackSudoku, grilleEnTexte, texteEnGrille } from '../../src/moteur/pack.ts';
import { definitionClassique } from '../../src/moteur/regions.ts';
import { estSolution } from '../../src/moteur/validation.ts';
import type { Niveau } from '../../src/types/niveaux.ts';
import { VERSION_FORMAT_PACK } from '../../src/types/pack.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { ENONCE_UNIQUE, SOLUTION_UNIQUE } from './grilles-connues.ts';

const def9 = definitionClassique(9, 3, 3);
const ctx9 = creerContexte(def9);
const NOMBRE_GRILLES = 200;

function lirePack(niveau: Niveau): unknown {
  const url = new URL(`../../src/games/sudoku-classique/packs/${niveau}.json`, import.meta.url);
  const contenu: unknown = JSON.parse(readFileSync(url, 'utf8'));
  return contenu;
}

describe('grilleEnTexte / texteEnGrille', () => {
  test('aller-retour sans perte', () => {
    assert.deepEqual(texteEnGrille(grilleEnTexte(ENONCE_UNIQUE)), ENONCE_UNIQUE);
  });
});

describe('estPackSudoku : packs corrompus refusés', () => {
  /** Pack valide minimal, construit à la main ; chaque test en modifie un champ. */
  const grille = {
    graine: 1,
    enonce: grilleEnTexte(ENONCE_UNIQUE),
    solution: grilleEnTexte(SOLUTION_UNIQUE),
    notation: { niveau: 'expert', force: 9, techniqueMax: 'x-wing', details: { 'singleton-nu': 40, 'x-wing': 1 } },
  };
  const pack = { version: VERSION_FORMAT_PACK, versionNotation: VERSION_NOTATION, jeu: 'sudoku-classique', niveau: 'expert', grilles: [grille] };
  const avecGrille = (modif: object): object => ({ ...pack, grilles: [{ ...grille, ...modif }] });
  const avecNotation = (modif: object): object => avecGrille({ notation: { ...grille.notation, ...modif } });

  test('le pack de référence est accepté', () => {
    assert.ok(estPackSudoku(pack));
  });

  const cas: readonly (readonly [string, unknown])[] = [
    ['valeur non objet', 'pack'],
    ['null', null],
    ['autre version de format', { ...pack, version: VERSION_FORMAT_PACK + 1 }],
    ['autre version de notation', { ...pack, versionNotation: VERSION_NOTATION + 1 }],
    ['niveau inconnu', { ...pack, niveau: 'impossible' }],
    ['jeu vide', { ...pack, jeu: '' }],
    ['aucune grille', { ...pack, grilles: [] }],
    ['graine négative', avecGrille({ graine: -1 })],
    ['énoncé trop court', avecGrille({ enonce: grille.enonce.slice(1) })],
    ['énoncé avec une lettre', avecGrille({ enonce: `x${grille.enonce.slice(1)}` })],
    ['solution avec un 0', avecGrille({ solution: `0${grille.solution.slice(1)}` })],
    ['chiffre donné différent de la solution', avecGrille({ enonce: `6${grille.enonce.slice(1)}` })],
    ['notation d\'un autre niveau', avecNotation({ niveau: 'moyen' })],
    ['force hors de la plage du niveau', avecNotation({ force: 10 })],
    ['technique max d\'un autre niveau', avecNotation({ techniqueMax: 'pointing', details: { pointing: 1 } })],
    ['technique max absente des détails', avecNotation({ details: { 'singleton-nu': 40 } })],
    ['technique inconnue dans les détails', avecNotation({ details: { 'x-wing': 1, inconnue: 2 } })],
    ['technique plus dure que le niveau', avecNotation({ details: { 'x-wing': 1, 'x-chain': 1 } })],
    ['nombre d\'utilisations nul', avecNotation({ details: { 'x-wing': 1, 'singleton-nu': 0 } })],
  ];
  for (const [nom, valeur] of cas) {
    test(`refusé : ${nom}`, () => assert.equal(estPackSudoku(valeur), false));
  }
});

for (const niveau of ['expert', 'diabolique'] as const) {
  describe(`pack ${niveau} embarqué`, () => {
    const contenu = lirePack(niveau);

    test('passe la garde, à la version de notation actuelle', () => {
      assert.ok(estPackSudoku(contenu), 'pack invalide (à régénérer : npm run packs ?)');
      assert.equal(contenu.versionNotation, VERSION_NOTATION);
      assert.equal(contenu.niveau, niveau);
      assert.equal(contenu.grilles.length, NOMBRE_GRILLES);
    });

    test('graines et énoncés tous différents', () => {
      assert.ok(estPackSudoku(contenu));
      assert.equal(new Set(contenu.grilles.map((g) => g.graine)).size, contenu.grilles.length);
      assert.equal(new Set(contenu.grilles.map((g) => g.enonce)).size, contenu.grilles.length);
    });

    test('chaque grille : solution unique = solution stockée, notation identique', () => {
      assert.ok(estPackSudoku(contenu));
      for (const g of contenu.grilles) {
        const enonce = texteEnGrille(g.enonce);
        assert.ok(estSolution(def9, texteEnGrille(g.solution)), `graine ${g.graine} : solution invalide`);
        assert.ok(estUnique(def9, enonce), `graine ${g.graine} : solution non unique`);
        assert.deepEqual(noterGrille(ctx9, enonce), g.notation, `graine ${g.graine} : notation différente`);
      }
    });

    test('reproductible : les premières graines redonnent les mêmes grilles', () => {
      assert.ok(estPackSudoku(contenu));
      for (const g of contenu.grilles.slice(0, 3)) {
        const r = genererParNiveau(def9, niveau, creerAlea(g.graine));
        assert.ok(r.ok);
        assert.equal(grilleEnTexte(r.enonce), g.enonce);
        assert.equal(grilleEnTexte(r.solution), g.solution);
      }
    });
  });
}
