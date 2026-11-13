// Tests du socle du solveur logique : contexte, état, noms, construction des étapes.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { masqueComplet } from '../../../src/moteur/candidats.ts';
import { creerContexte, regionCommune, seVoient } from '../../../src/moteur/logique/contexte.ts';
import { aDesEffets, appliquerEtape, contradiction, etatInitial } from '../../../src/moteur/logique/etat.ts';
import { listeFr, nomCellule, nomRegion } from '../../../src/moteur/logique/noms.ts';
import { construireEtape, type InfosTechnique } from '../../../src/moteur/logique/technique.ts';
import { cage, definitionClassique } from '../../../src/moteur/regions.ts';
import type { Etape } from '../../../src/types/logique.ts';
import { ENONCE_UNIQUE } from '../grilles-connues.ts';
import { defIrreguliere } from './surete-commun.ts';
import { c, ctx9, ctxDiagonal, def9, etatVide, fixer } from './aide.ts';

describe('contexte', () => {
  test('cases qui se voient, régions complètes', () => {
    assert.ok(seVoient(ctx9, c('L1C1'), c('L1C9')));
    assert.ok(seVoient(ctx9, c('L1C1'), c('L3C3')));
    assert.ok(!seVoient(ctx9, c('L1C1'), c('L2C4')));
    assert.ok(!seVoient(ctx9, c('L1C1'), c('L1C1')));
    assert.equal(ctx9.voisins[0]?.length, 20);
    assert.ok(seVoient(ctxDiagonal, c('L1C1'), c('L9C9')));
    assert.equal(ctx9.complete.filter((x) => x === 1).length, 27);
  });

  test('une cage est distincte mais pas complète', () => {
    const ctx = creerContexte({ ...def9, regions: [...def9.regions, cage([0, 40], 10)] });
    assert.equal(ctx.complete[27], 0);
    assert.ok(ctx.regionsDistinctes.includes(27));
    assert.ok(seVoient(ctx, 0, 40));
  });

  test('regionCommune', () => {
    assert.equal(regionCommune(ctx9, [c('L1C1'), c('L1C5')], null), 0);
    assert.equal(regionCommune(ctx9, [c('L1C1'), c('L2C2')], ['ligne', 'colonne']), -1);
    assert.equal(regionCommune(ctx9, [c('L1C1'), c('L2C2')], null), 18);
  });
});

describe('noms', () => {
  test('cases et régions', () => {
    assert.equal(nomCellule(ctx9, c('L3C5')), 'L3C5');
    assert.equal(nomRegion(ctx9, 2), 'la ligne 3');
    assert.equal(nomRegion(ctx9, 13), 'la colonne 5');
    assert.equal(nomRegion(ctx9, 26), 'le bloc 9');
    assert.equal(nomRegion(ctxDiagonal, 27), 'la diagonale ↘');
    assert.equal(nomRegion(ctxDiagonal, 28), 'la diagonale ↙');
    assert.equal(nomRegion(creerContexte(defIrreguliere), 18), 'la région 1');
    const ctx6 = creerContexte(definitionClassique(6, 2, 3));
    assert.equal(nomCellule(ctx6, 7), 'L2C2');
  });

  test('listes en français', () => {
    assert.equal(listeFr([]), '');
    assert.equal(listeFr(['a']), 'a');
    assert.equal(listeFr(['a', 'b']), 'a et b');
    assert.equal(listeFr(['a', 'b', 'c']), 'a, b et c');
  });
});

describe('état', () => {
  test('etatInitial : candidats selon les chiffres placés', () => {
    const etat = etatInitial(ctx9, ENONCE_UNIQUE);
    assert.equal(etat.candidats[0], 0); // case remplie
    // L1C3 : ni 5, 3, 7 (ligne), ni 8 (colonne), ni 6, 9 (bloc)
    assert.equal(etat.candidats[2], masqueComplet([1, 2, 4]));
    assert.throws(() => etatInitial(ctx9, [1, 2, 3]));
  });

  test('appliquerEtape : nouvel état, placement propagé aux voisines', () => {
    const avant = Object.freeze(etatVide());
    const etape: Etape = {
      technique: 'singleton-nu',
      niveau: 'facile',
      cellules: [],
      candidatsMotif: [],
      regions: [],
      placements: [{ cellule: 0, valeur: 5 }],
      eliminations: [{ cellule: 80, valeurs: [1, 2] }],
      explication: '',
    };
    const apres = appliquerEtape(ctx9, avant, etape);
    assert.equal(apres.valeurs[0], 5);
    assert.equal(apres.candidats[0], 0);
    assert.equal(apres.candidats[c('L1C9')], masqueComplet([1, 2, 3, 4, 6, 7, 8, 9]));
    assert.equal(apres.candidats[80], masqueComplet([3, 4, 5, 6, 7, 8, 9]));
    assert.equal(avant.valeurs[0], 0);
    assert.ok(aDesEffets(avant, etape));
    assert.ok(!aDesEffets(apres, etape));
  });

  test('contradiction', () => {
    assert.equal(contradiction(ctx9, etatVide()), null);
    assert.match(contradiction(ctx9, fixer(etatVide(), { L2C2: [] })) ?? '', /L2C2 n'a plus aucun candidat/);
    const sansSept = etatVide();
    const candidats = [...sansSept.candidats];
    for (let col = 0; col < 9; col++) candidats[col] = masqueComplet([1, 2, 3, 4, 5, 6, 8, 9]);
    assert.match(contradiction(ctx9, { valeurs: sansSept.valeurs, candidats }) ?? '', /La ligne 1 n'a plus de place pour le 7/);
  });
});

describe('construireEtape', () => {
  const infos: InfosTechnique = { id: 'paire-nue', niveau: 'moyen', nom: 'Paire nue' };
  const etat = fixer(etatVide(), { L1C1: [2, 7], L1C2: [3, 4] });
  const base = { cellules: [], candidatsMotif: [], regions: [], description: 'Motif.', placements: [] };

  test('ne garde que les candidats encore présents ; null si rien ne change', () => {
    const etape = construireEtape(infos, ctx9, etat, {
      ...base,
      eliminations: [
        { cellule: c('L1C1'), masque: masqueComplet([2, 5]) },
        { cellule: c('L1C2'), masque: masqueComplet([7]) },
      ],
    });
    assert.deepEqual(etape?.eliminations, [{ cellule: 0, valeurs: [2] }]);
    assert.equal(etape?.explication, 'Motif. On élimine le 2 de L1C1.');
    assert.equal(construireEtape(infos, ctx9, etat, { ...base, eliminations: [{ cellule: 1, masque: masqueComplet([7]) }] }), null);
  });

  test('regroupe les éliminations par valeur dans l\'explication', () => {
    const etape = construireEtape(infos, ctx9, etatVide(), {
      ...base,
      eliminations: [0, 1, 2].map((cellule) => ({ cellule, masque: masqueComplet(cellule === 2 ? [6] : [4]) })),
    });
    assert.equal(etape?.explication, 'Motif. On élimine le 4 de L1C1 et L1C2 ; le 6 de L1C3.');
  });
});
