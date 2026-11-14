// Tests de l'interaction des chiffres casés (interaction.ts : touchers, liste, mises en évidence).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  actionEffacer,
  AUCUNE,
  caseVoisine,
  casesASignaler,
  casesEnEvidence,
  emplacementsCibles,
  groupesListe,
  selectionParFleche,
  selectionValide,
  toucherCase,
  toucherNombre,
  type Selection,
} from '../../../src/games/chiffres-cases/interaction.ts';
import { etatInitialCases, placerNombre } from '../../../src/games/chiffres-cases/regles.ts';
import type { DonneesCases, EtatCases } from '../../../src/games/chiffres-cases/types.ts';
import { donneesDe } from './aide.ts';

/**
 * GRILLE B (3 × 3, deux cases noires), emplacements de 2 et 3 cases :
 *   1 2 #     0 : H L1C1 = 12    1 : V L1C1 = 13    2 : V L1C2 = 246
 *   3 4 5     3 : H L2C1 = 345   4 : V L2C3 = 57    5 : H L3C2 = 67
 *   # 6 7     Cases : 0 1 2 / 3 4 5 / 6 7 8 (2 et 6 noires)
 * Liste : 2 chiffres = 12, 13, 57, 67 ; 3 chiffres = 246, 345.
 */
const GRILLE_B = ['12#', '345', '#67'];
const H0 = 0;
const V1 = 1;
const V2 = 2;
const H3 = 3;
const V4 = 4;
const H5 = 5;

function grilleB(preplaces: readonly number[] = []): { donnees: DonneesCases; etat: EtatCases } {
  const donnees = donneesDe(GRILLE_B, preplaces);
  return { donnees, etat: etatInitialCases(donnees) };
}

function emplacement(id: number, cellule: number): Selection {
  return { type: 'emplacement', emplacement: id, cellule };
}

describe('chiffres casés : toucher une case', () => {
  test('l\'horizontal d\'abord ; toucher à nouveau la même case bascule sur le vertical, et inversement', () => {
    const { donnees, etat } = grilleB();
    const r1 = toucherCase(AUCUNE, etat, donnees, 0);
    assert.deepEqual(r1, { selection: emplacement(H0, 0), action: null });
    const r2 = toucherCase(r1.selection, etat, donnees, 0);
    assert.deepEqual(r2.selection, emplacement(V1, 0));
    assert.deepEqual(toucherCase(r2.selection, etat, donnees, 0).selection, emplacement(H0, 0));
    // Une autre case de l'emplacement sélectionné repart de l'horizontal
    assert.deepEqual(toucherCase(r2.selection, etat, donnees, 4).selection, emplacement(H3, 4));
  });

  test('un emplacement pré-placé n\'est jamais sélectionné', () => {
    const { donnees, etat } = grilleB([H0]);
    const r = toucherCase(AUCUNE, etat, donnees, 0);
    assert.deepEqual(r.selection, emplacement(V1, 0));
    assert.deepEqual(toucherCase(r.selection, etat, donnees, 0).selection, emplacement(V1, 0));
    // Case 1 : horizontal pré-placé, vertical 246 libre
    assert.deepEqual(toucherCase(AUCUNE, etat, donnees, 1).selection, emplacement(V2, 1));
  });

  test('zone vide (case noire, marge) : la sélection est annulée', () => {
    const { donnees, etat } = grilleB();
    assert.deepEqual(toucherCase(emplacement(H0, 0), etat, donnees, 2), { selection: AUCUNE, action: null });
    assert.deepEqual(toucherCase({ type: 'nombre', nombre: '57' }, etat, donnees, null), { selection: AUCUNE, action: null });
  });
});

describe('chiffres casés : emplacement puis nombre', () => {
  test('un nombre de la bonne longueur remplit l\'emplacement sélectionné', () => {
    const { donnees, etat } = grilleB();
    const r = toucherNombre(emplacement(H0, 1), etat, donnees, '67');
    assert.deepEqual(r, { selection: emplacement(H0, 1), action: { type: 'placer', emplacement: H0, nombre: '67' } });
  });

  test('autre longueur, ou nombre déjà dans l\'emplacement : sans effet', () => {
    const { donnees, etat } = grilleB();
    const sel = emplacement(H0, 0);
    assert.deepEqual(toucherNombre(sel, etat, donnees, '246'), { selection: sel, action: null });
    const pose = placerNombre(etat, donnees, H0, '12');
    assert.deepEqual(toucherNombre(sel, pose, donnees, '12'), { selection: sel, action: null });
  });

  test('un nombre barré se replace ailleurs (le placement le déplace)', () => {
    const { donnees, etat } = grilleB();
    const pose = placerNombre(etat, donnees, H0, '67');
    const r = toucherNombre(emplacement(H5, 8), pose, donnees, '67');
    assert.deepEqual(r.action, { type: 'placer', emplacement: H5, nombre: '67' });
  });

  test('un nombre pré-placé est verrouillé', () => {
    const { donnees, etat } = grilleB([H0]);
    const sel = emplacement(V4, 5);
    assert.deepEqual(toucherNombre(sel, etat, donnees, '12'), { selection: sel, action: null });
    assert.deepEqual(toucherNombre(AUCUNE, etat, donnees, '12'), { selection: AUCUNE, action: null });
  });
});

describe('chiffres casés : nombre puis emplacement', () => {
  test('sans sélection, toucher un nombre le sélectionne ; ses cibles sont les emplacements vides de sa longueur', () => {
    const { donnees, etat } = grilleB();
    const r = toucherNombre(AUCUNE, etat, donnees, '57');
    assert.deepEqual(r, { selection: { type: 'nombre', nombre: '57' }, action: null });
    assert.deepEqual(emplacementsCibles(etat, donnees, '57'), [H0, V1, V4, H5]);
    const pose = placerNombre(etat, donnees, H0, '12');
    assert.deepEqual(emplacementsCibles(pose, donnees, '57'), [V1, V4, H5]);
    // Mise en évidence : cases des cibles
    const ev = casesEnEvidence(r.selection, pose, donnees);
    assert.deepEqual([...ev.cibles].sort((a, b) => a - b), [0, 3, 5, 7, 8]);
    assert.equal(ev.selection.size, 0);
  });

  test('toucher une case d\'une cible y place le nombre (l\'horizontal d\'abord) et sélectionne l\'emplacement', () => {
    const { donnees, etat } = grilleB();
    const sel: Selection = { type: 'nombre', nombre: '57' };
    assert.deepEqual(toucherCase(sel, etat, donnees, 8), {
      selection: emplacement(H5, 8),
      action: { type: 'placer', emplacement: H5, nombre: '57' },
    });
    // Case 3 : horizontal 345 (autre longueur), vertical 13 (cible)
    assert.deepEqual(toucherCase(sel, etat, donnees, 3).action, { type: 'placer', emplacement: V1, nombre: '57' });
  });

  test('toucher à nouveau le nombre annule ; un autre nombre le remplace', () => {
    const { donnees, etat } = grilleB();
    const sel: Selection = { type: 'nombre', nombre: '57' };
    assert.deepEqual(toucherNombre(sel, etat, donnees, '57'), { selection: AUCUNE, action: null });
    assert.deepEqual(toucherNombre(sel, etat, donnees, '13').selection, { type: 'nombre', nombre: '13' });
  });

  test('toucher une case hors des cibles sélectionne son emplacement, sans rien placer', () => {
    const { donnees, etat } = grilleB();
    const r = toucherCase({ type: 'nombre', nombre: '246' }, etat, donnees, 0);
    assert.deepEqual(r, { selection: emplacement(H0, 0), action: null });
  });

  test('un nombre barré sélectionné se déplace vers la cible touchée', () => {
    const { donnees, etat } = grilleB();
    const pose = placerNombre(etat, donnees, H0, '12');
    const r = toucherNombre(AUCUNE, pose, donnees, '12');
    assert.deepEqual(r.selection, { type: 'nombre', nombre: '12' });
    assert.deepEqual(toucherCase(r.selection, pose, donnees, 7).action, { type: 'placer', emplacement: H5, nombre: '12' });
  });
});

describe('chiffres casés : liste groupée', () => {
  test('sans sélection : groupes par longueur croissante, aucun en avant, rien d\'estompé', () => {
    const { donnees, etat } = grilleB();
    const groupes = groupesListe(AUCUNE, etat, donnees);
    assert.deepEqual(groupes.map((g) => [g.longueur, g.enAvant]), [[2, false], [3, false]]);
    assert.deepEqual(groupes[0]?.nombres.map((n) => n.texte), ['12', '13', '57', '67']);
    assert.ok(groupes.every((g) => g.nombres.every((n) => !n.estompe && !n.choisi && n.etat === 'libre')));
  });

  test('emplacement sélectionné : son groupe en tête et en avant, les autres estompés ; nombre posé « choisi »', () => {
    const { donnees, etat } = grilleB();
    const pose = placerNombre(etat, donnees, H3, '345');
    const groupes = groupesListe(emplacement(H3, 4), pose, donnees);
    assert.deepEqual(groupes.map((g) => [g.longueur, g.enAvant]), [[3, true], [2, false]]);
    assert.ok(groupes[1]?.nombres.every((n) => n.estompe));
    assert.deepEqual(groupes[0]?.nombres.map((n) => [n.texte, n.etat, n.choisi]), [
      ['246', 'libre', false],
      ['345', 'utilise', true],
    ]);
  });

  test('nombre sélectionné : son groupe en avant, rien d\'estompé ; pré-placés verrouillés', () => {
    const { donnees, etat } = grilleB([H0]);
    const groupes = groupesListe({ type: 'nombre', nombre: '57' }, etat, donnees);
    assert.equal(groupes[0]?.longueur, 2);
    assert.equal(groupes[0]?.enAvant, true);
    const deux = groupes[0]?.nombres ?? [];
    assert.deepEqual(deux.map((n) => [n.texte, n.etat, n.choisi, n.estompe]), [
      ['12', 'verrouille', false, false],
      ['13', 'libre', false, false],
      ['57', 'libre', true, false],
      ['67', 'libre', false, false],
    ]);
  });
});

describe('chiffres casés : effacer, signal, clavier', () => {
  test('Effacer : emplacement sélectionné, ou celui du nombre sélectionné ; jamais un pré-placé', () => {
    const { donnees, etat } = grilleB([H3]);
    const pose = placerNombre(etat, donnees, H0, '12');
    assert.deepEqual(actionEffacer(emplacement(H0, 0), pose, donnees), { type: 'effacer', emplacement: H0 });
    assert.equal(actionEffacer(emplacement(V1, 0), pose, donnees), null); // vide
    assert.deepEqual(actionEffacer({ type: 'nombre', nombre: '12' }, pose, donnees), { type: 'effacer', emplacement: H0 });
    assert.equal(actionEffacer({ type: 'nombre', nombre: '345' }, pose, donnees), null); // pré-placé
    assert.equal(actionEffacer(AUCUNE, pose, donnees), null);
  });

  test('signal : cases d\'un nombre déplacé et d\'un nombre croisé retiré (pas celles reprises par le nouveau)', () => {
    const { donnees, etat } = grilleB();
    // 13 en V1 (cases 0, 3) ; 57 en V4 (cases 5, 8). Placer 57 en H0 (cases 0, 1) :
    // 57 quitte V4 (déplacé), et 13 (1 en case 0 ≠ 5) est retiré.
    const avant = placerNombre(placerNombre(etat, donnees, V1, '13'), donnees, V4, '57');
    const cases = casesASignaler(avant, donnees, { type: 'placer', emplacement: H0, nombre: '57' });
    assert.deepEqual([...cases].sort((a, b) => a - b), [3, 5, 8]);
    // Placement sans conséquence, effacement : rien à signaler
    assert.deepEqual(casesASignaler(etat, donnees, { type: 'placer', emplacement: H0, nombre: '12' }), []);
    assert.deepEqual(casesASignaler(avant, donnees, { type: 'effacer', emplacement: V1 }), []);
  });

  test('flèches : case voisine (cases noires sautées), emplacement dans le sens de la flèche', () => {
    const { donnees } = grilleB();
    assert.equal(caseVoisine(donnees, 1, 0, 1), null); // case 2 noire puis bord
    assert.equal(caseVoisine(donnees, 5, 1, 0), 8);
    assert.deepEqual(selectionParFleche(AUCUNE, donnees, 0, 1), emplacement(H0, 0));
    assert.deepEqual(selectionParFleche(emplacement(H0, 0), donnees, 0, 1), emplacement(H0, 1));
    assert.deepEqual(selectionParFleche(emplacement(H0, 1), donnees, 1, 0), emplacement(V2, 4));
    assert.deepEqual(selectionParFleche(emplacement(H0, 0), donnees, 1, 0), emplacement(V1, 3));
    assert.deepEqual(selectionParFleche(emplacement(H0, 1), donnees, 0, 1), emplacement(H0, 1)); // bord : immobile
  });

  test('sélection d\'un nombre devenu verrouillé : annulée', () => {
    const { donnees, etat } = grilleB([H0]);
    assert.deepEqual(selectionValide({ type: 'nombre', nombre: '12' }, etat, donnees), AUCUNE);
    assert.deepEqual(selectionValide({ type: 'nombre', nombre: '13' }, etat, donnees), { type: 'nombre', nombre: '13' });
  });
});
