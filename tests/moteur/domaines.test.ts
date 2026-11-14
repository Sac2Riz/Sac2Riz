// Domaine par case (étape 7a) : chaque case peut avoir ses propres valeurs autorisées (Tectonic :
// 1 à N selon sa zone). Sans domaines (sudoku), le comportement doit rester exactement le même.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compterSolutions } from '../../src/moteur/backtracking.ts';
import { masqueComplet } from '../../src/moteur/candidats.ts';
import { creerContexte } from '../../src/moteur/logique/contexte.ts';
import { contradiction, etatInitial } from '../../src/moteur/logique/etat.ts';
import { nomRegion } from '../../src/moteur/logique/noms.ts';
import {
  definitionClassique,
  domainesZones,
  regionsCarres,
  regionsClassiques,
  regionsDiagonales,
  regionsLignes,
  regionsZones,
  valeursUnA,
} from '../../src/moteur/regions.ts';
import { compiler } from '../../src/moteur/structure.ts';
import { conflits } from '../../src/moteur/validation.ts';
import type { DefinitionGrille } from '../../src/types/grille.ts';
import { CARTE_TECTONIC, ctxTectonic, defTectonic } from './logique/aide.ts';

describe('domaines : sudoku inchangé', () => {
  const sudokus: readonly [string, DefinitionGrille][] = [
    ['9x9', definitionClassique(9, 3, 3)],
    ['6x6', definitionClassique(6, 2, 3)],
    ['diagonal', { ...definitionClassique(9, 3, 3), regions: [...regionsClassiques(9, 3, 3), ...regionsDiagonales(9)] }],
  ];
  for (const [nom, def] of sudokus) {
    test(`${nom} : domaine = toutes les valeurs, régions toutes complètes comme avant`, () => {
      const s = compiler(def);
      assert.ok(s.domaine.every((m) => m === s.masqueValeurs));
      assert.ok(s.valeursRegion.every((m) => m === s.masqueValeurs));
      const ctx = creerContexte(def);
      // Ancienne règle : complète = autant de cases que de valeurs
      def.regions.forEach((r, i) => assert.equal(ctx.complete[i], r.cellules.length === def.valeurs.length ? 1 : 0));
    });
  }
});

describe('domaines : compilation', () => {
  test('domaines et valeurs des régions', () => {
    const s = compiler(defTectonic);
    assert.deepEqual([...s.domaine], domainesZones(CARTE_TECTONIC));
    assert.equal(s.domaine[0], masqueComplet([1, 2, 3, 4, 5]));
    assert.equal(s.domaine[8], masqueComplet([1, 2, 3]));
    assert.equal(s.valeursRegion[2], masqueComplet([1, 2, 3])); // zone 2
    // Carré L2C3-L3C4 (zones 1 et 2) : réunion 1 à 4
    const carre = defTectonic.regions.findIndex((r) => r.cellules.join() === '6,7,10,11');
    assert.equal(s.valeursRegion[carre], masqueComplet([1, 2, 3, 4]));
  });

  test('refuse des domaines incohérents', () => {
    const base: DefinitionGrille = { lignes: 1, colonnes: 2, valeurs: [1, 2, 3], regions: regionsLignes(1, 2), domaines: null };
    assert.throws(() => compiler({ ...base, domaines: [1] }), /domaines pour 2 cases/);
    assert.throws(() => compiler({ ...base, domaines: [1, 0] }), /domaine 0 vide/);
    assert.throws(() => compiler({ ...base, domaines: [1, 8] }), /hors des valeurs/);
    // Deux cases distinctes qui n'acceptent toutes les deux que le 1
    assert.throws(() => compiler({ ...base, domaines: [1, 1] }), /2 cases pour 1 valeurs distinctes/);
  });

  test("carré 2×2 impossible : moins de 4 valeurs pour ses 4 cases", () => {
    const carte = [0, 0, 1, 1];
    const def: DefinitionGrille = {
      lignes: 2,
      colonnes: 2,
      valeurs: [1, 2],
      regions: [...regionsZones(carte), ...regionsCarres(2, 2)],
      domaines: domainesZones(carte),
    };
    assert.throws(() => compiler(def), /4 cases pour 2 valeurs distinctes/);
  });
});

describe('domaines : backtracking, état, contradictions, conflits', () => {
  test('le backtracking respecte le domaine de chaque case', () => {
    const def: DefinitionGrille = { lignes: 1, colonnes: 2, valeurs: [1, 2, 3], regions: regionsLignes(1, 2), domaines: [0b001, 0b011] };
    const r = compterSolutions(def, [0, 0]);
    assert.equal(r.nombre, 1);
    assert.deepEqual(r.solution, [1, 2]);
    // Chiffre donné hors domaine : aucune solution
    assert.equal(compterSolutions(def, [0, 3]).nombre, 0);
  });

  test('une zone de 4 cases seule : 4! solutions', () => {
    const carte = [0, 0, 0, 0];
    const def: DefinitionGrille = {
      lignes: 2,
      colonnes: 2,
      valeurs: valeursUnA(4),
      regions: [...regionsZones(carte), ...regionsCarres(2, 2)],
      domaines: domainesZones(carte),
    };
    assert.equal(compterSolutions(def, [0, 0, 0, 0], { limite: 100 }).nombre, 24);
  });

  test('régions complètes déduites des domaines', () => {
    const zones = [0, 1, 2];
    zones.forEach((r) => assert.equal(ctxTectonic.complete[r], 1, `zone ${r}`));
    // Carrés : réunion de 4 ou 5 valeurs ; complet seulement s'il n'y en a que 4
    defTectonic.regions.forEach((region, r) => {
      if (region.type !== 'unicite' || region.forme !== 'carre') return;
      const attendu = region.cellules.join() === '6,7,10,11' ? 1 : 0;
      assert.equal(ctxTectonic.complete[r], attendu, region.cellules.join());
    });
  });

  test('état de départ : candidats limités au domaine', () => {
    const etat = etatInitial(ctxTectonic, new Array<number>(12).fill(0));
    assert.equal(etat.candidats[8], masqueComplet([1, 2, 3]));
    assert.equal(etat.candidats[3], masqueComplet([1, 2, 3, 4]));
  });

  test("contradiction : un chiffre de la zone n'a plus de place", () => {
    const etat = etatInitial(ctxTectonic, new Array<number>(12).fill(0));
    const sansTrois = etat.candidats.map((m, c) => ([8, 9, 10].includes(c) ? m & ~masqueComplet([3]) : m));
    assert.match(contradiction(ctxTectonic, { valeurs: etat.valeurs, candidats: sansTrois }) ?? '', /La zone de L3C1 n'a plus de place pour le 3/);
  });

  test('conflits : chiffre hors du domaine de sa case', () => {
    const valeurs = new Array<number>(12).fill(0);
    valeurs[8] = 4; // zone de 3 cases
    assert.deepEqual(conflits(defTectonic, valeurs), [8]);
    valeurs[8] = 3;
    assert.deepEqual(conflits(defTectonic, valeurs), []);
  });
});

describe('fabriques et noms (Tectonic)', () => {
  test('carrés 2×2, zones et domaines', () => {
    const carres = regionsCarres(3, 4);
    assert.equal(carres.length, 6);
    assert.deepEqual(carres[0]?.cellules, [0, 1, 4, 5]);
    assert.ok(carres.every((r) => r.forme === 'carre'));
    const zones = regionsZones(CARTE_TECTONIC);
    assert.deepEqual(zones.map((z) => z.cellules), [[0, 1, 2, 4, 5], [3, 6, 7, 11], [8, 9, 10]]);
    assert.ok(zones.every((r) => r.forme === 'zone'));
    assert.deepEqual(domainesZones([0, 0, 1]), [0b11, 0b11, 0b1]);
  });

  test('noms des zones et des carrés', () => {
    assert.equal(nomRegion(ctxTectonic, 1), 'la zone de L1C4');
    assert.equal(nomRegion(ctxTectonic, 3), 'le carré L1C1-L2C2');
  });
});
