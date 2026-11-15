// Tests de l'interaction du Tectonic (fonctions pures de interaction.ts) : valeurs possibles pour le
// pavé, mise en évidence, action des touches, flèches, tracé des traits. Grille : l'exemple de la fiche.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fiche } from '../../../src/games/tectonic/fiche.ts';
import {
  actionSaisie,
  casesEnEvidence,
  deplacer,
  modePose,
  traits,
  valeursPossibles,
} from '../../../src/games/tectonic/interaction.ts';
import { vue } from '../../../src/games/tectonic/vue.ts';

const D = fiche.exemple.donnees;
// Zones de l'exemple (6 × 6) : zone 1 = cases 3, 4, 5 (3 cases) ; zone 0 = 0, 1, 2, 6 (4 cases) ;
// zone 2 = 7, 8, 9, 14, 15 (5 cases). Case 1 : donnée (2). Case 0 : vide.

describe('Tectonic : valeurs possibles pour le pavé', () => {
  test('sans sélection : aucune restriction', () => {
    assert.equal(valeursPossibles(D, null), null);
  });

  test('case vide : 1 à la taille de sa zone', () => {
    assert.deepEqual(valeursPossibles(D, 3), ['1', '2', '3']); // zone de 3 : 4 et 5 grisés
    assert.deepEqual(valeursPossibles(D, 0), ['1', '2', '3', '4']);
    assert.deepEqual(valeursPossibles(D, 15), ['1', '2', '3', '4', '5']);
  });

  test('case donnée : aucune valeur (tout le pavé grisé)', () => {
    assert.equal(D.enonce[1], 2);
    assert.deepEqual(valeursPossibles(D, 1), []);
  });

  test('ne dépend que de la zone, jamais des chiffres voisins (pas d\'indice gratuit)', () => {
    // La case 2 touche la case 1 qui porte un 2 : le 2 reste proposé
    assert.ok(valeursPossibles(D, 2)?.includes('2'));
  });

  test('toujours parmi les touches du pavé commun', () => {
    assert.equal(vue.pave.type, 'commun');
    const touches: readonly string[] = vue.pave.type === 'commun' ? vue.pave.valeurs : [];
    for (let cellule = 0; cellule < D.zones.length; cellule++) {
      for (const v of valeursPossibles(D, cellule) ?? []) assert.ok(touches.includes(v), `${v} hors du pavé`);
    }
  });
});

describe('Tectonic : mise en évidence', () => {
  test('sans sélection : rien', () => {
    assert.equal(casesEnEvidence(D, null).size, 0);
  });

  test('coin : ses 3 cases autour et sa zone, sans elle-même', () => {
    // Case 0 : touche 1, 6, 7 ; zone 0 = 0, 1, 2, 6
    assert.deepEqual([...casesEnEvidence(D, 0)].sort((a, b) => a - b), [1, 2, 6, 7]);
  });

  test('case intérieure : ses 8 voisines et toute sa zone', () => {
    // Case 14 (ligne 3, colonne 3) : voisines 7, 8, 9, 13, 15, 19, 20, 21 ; zone 2 = 7, 8, 9, 14, 15
    assert.deepEqual([...casesEnEvidence(D, 14)].sort((a, b) => a - b), [7, 8, 9, 13, 15, 19, 20, 21]);
  });
});

describe('Tectonic : action des touches', () => {
  test('mode de pose : notes, placer (retrait automatique), placer-seul', () => {
    assert.equal(modePose(true, true), 'noter');
    assert.equal(modePose(true, false), 'noter');
    assert.equal(modePose(false, true), 'placer');
    assert.equal(modePose(false, false), 'placer-seul');
  });

  test('valeur permise : action du mode choisi', () => {
    assert.deepEqual(actionSaisie(D, 3, '2', 'placer'), { type: 'placer', cellule: 3, valeur: 2 });
    assert.deepEqual(actionSaisie(D, 3, '3', 'noter'), { type: 'noter', cellule: 3, valeur: 3 });
  });

  test('rien de sélectionné, case donnée, valeur hors de la zone : aucune action', () => {
    assert.equal(actionSaisie(D, null, '1', 'placer'), null);
    assert.equal(actionSaisie(D, 1, '1', 'placer'), null);
    assert.equal(actionSaisie(D, 3, '4', 'placer'), null);
    assert.equal(actionSaisie(D, 3, 'x', 'placer'), null);
  });
});

describe('Tectonic : flèches du clavier', () => {
  test('sans sélection : première case', () => {
    assert.equal(deplacer(D, null, 0, 1), 0);
  });
  test('déplacements et passage de l\'autre côté de la grille', () => {
    assert.equal(deplacer(D, 0, 0, 1), 1);
    assert.equal(deplacer(D, 0, 1, 0), 6);
    assert.equal(deplacer(D, 0, -1, 0), 30);
    assert.equal(deplacer(D, 0, 0, -1), 5);
    assert.equal(deplacer(D, 35, 1, 1), 0);
  });
});

describe('Tectonic : traits de la grille', () => {
  test('un segment par côté intérieur : trait fin dans une zone, épais entre deux zones', () => {
    const { fins, epais } = traits(D);
    const compter = (d: string): number => (d.match(/M/g) ?? []).length;
    // 6 × 6 : 5 × 6 côtés verticaux + 6 × 5 horizontaux = 60 côtés intérieurs
    assert.equal(compter(fins) + compter(epais), 60);
    // Case 2 (zone 0) | case 3 (zone 1) : épais ; case 0 | case 1 (zone 0) : fin
    assert.ok(epais.includes('M3 0v1'));
    assert.ok(fins.includes('M1 0v1'));
    // Case 0 au-dessus de la case 6 (zone 0) : fin ; case 1 au-dessus de la case 7 (zone 2) : épais
    assert.ok(fins.includes('M0 1h1'));
    assert.ok(epais.includes('M1 1h1'));
  });

  test('nombre de côtés fins = cases moins zones… au moins (chaque zone est d\'un seul tenant)', () => {
    const { fins } = traits(D);
    const nbZones = new Set(D.zones).size;
    assert.ok((fins.match(/M/g) ?? []).length >= D.zones.length - nbZones);
  });
});
