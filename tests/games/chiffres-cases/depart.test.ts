// Tests du réglage « Toujours placer un nombre au départ » (depart.ts, LogiqueJeu.preparer).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { emplacementAuDepart, ouverture, OUVERTURE_MIN } from '../../../src/games/chiffres-cases/depart.ts';
import { estVerrouille, groupesListe, AUCUNE } from '../../../src/games/chiffres-cases/interaction.ts';
import { logique } from '../../../src/games/chiffres-cases/logique.ts';
import { convertirPack, estPackCases } from '../../../src/games/chiffres-cases/packs.ts';
import { structureDe } from '../../../src/games/chiffres-cases/probleme.ts';
import type { DonneesCases } from '../../../src/games/chiffres-cases/types.ts';
import { logique as logiqueSudoku } from '../../../src/games/sudoku-classique/logique.ts';
import { NIVEAUX, type Notation } from '../../../src/types/niveaux.ts';
import { creerAlea } from '../../../src/utils/alea.ts';
import { donneesDe, GRILLE_A, H1, lirePack } from './aide.ts';

const ACTIVE = { nombreAuDepart: true };
const INACTIVE = { nombreAuDepart: false };
/** Rang du niveau (−1 : non résolu par la logique). */
const rang = (n: Notation | null): number => (n === null ? -1 : NIVEAUX.indexOf(n.niveau));

/** Premières grilles sans pré-placé du pack Diabolique. */
function diaboliques(nombre: number): DonneesCases[] {
  const pack = lirePack('diabolique');
  assert.ok(estPackCases(pack));
  return convertirPack(pack).map((p) => p.donnees).filter((d) => d.preplaces.length === 0).slice(0, nombre);
}

/** Quelques grilles Moyen et Difficile générées sans pré-placé (graines fixes). */
function grillesSansPreplace(): DonneesCases[] {
  const grilles: DonneesCases[] = [];
  for (const niveau of ['moyen', 'difficile'] as const) {
    for (let graine = 1; grilles.filter((d) => d.largeur === (niveau === 'moyen' ? 9 : 11)).length < 3 && graine < 60; graine++) {
      const r = logique.generer(niveau, creerAlea(graine), { doitArreter: () => false });
      if (r.ok && r.donnees.preplaces.length === 0) grilles.push(r.donnees);
    }
  }
  return grilles;
}

describe('chiffres casés : nombre au départ', () => {
  const grilles = grillesSansPreplace();

  test('des grilles sans pré-placé existent pour les essais', () => {
    assert.ok(grilles.length >= 4, `${grilles.length} grilles seulement`);
  });

  test('option inactive : données inchangées (même objet), avec ou sans pré-placé', () => {
    for (const d of [...grilles, donneesDe(GRILLE_A, [H1])]) assert.equal(logique.preparer(d, INACTIVE), d);
  });

  test('grille qui a déjà un pré-placé : rien ne change, même option active', () => {
    const avec = donneesDe(GRILLE_A, [H1]);
    assert.equal(logique.preparer(avec, ACTIVE), avec);
    const generee = logique.generer('debutant', creerAlea(4), { doitArreter: () => false });
    assert.ok(generee.ok && generee.donnees.preplaces.length > 0);
    assert.equal(logique.preparer(generee.donnees, ACTIVE), generee.donnees);
  });

  test('option active, grille sans pré-placé : exactement un pré-placé ajouté, rien d\'autre ne change', () => {
    for (const d of grilles) {
      const p = logique.preparer(d, ACTIVE);
      assert.equal(p.preplaces.length, 1);
      assert.deepEqual({ ...p, preplaces: [] }, d);
      assert.ok(logique.estDonnees(JSON.parse(JSON.stringify(p))));
    }
  });

  test('choix : la meilleure ouverture parmi les nombres qui gardent le niveau (sinon un cran de moins)', () => {
    for (const d of [...grilles, ...diaboliques(4)]) {
      const id = emplacementAuDepart(d);
      assert.ok(id !== null);
      const vise = rang(logique.noter(d));
      const { grille } = structureDe(d).probleme;
      const essais = grille.emplacements.map((e) => ({
        id: e.id,
        ouverture: ouverture(d, e.id),
        rang: rang(logique.noter({ ...d, preplaces: [e.id] })),
      }));
      const choisi = essais.find((e) => e.id === id);
      assert.ok(choisi !== undefined);
      // Jamais plus difficile qu'avant
      assert.ok(choisi.rang <= vise);
      const gardeEtOuvre = essais.filter((e) => e.rang >= vise && e.ouverture >= OUVERTURE_MIN);
      if (gardeEtOuvre.length > 0) {
        // Un nombre garde le niveau en ouvrant la grille : le choisi en fait partie, et aucun autre n'ouvre mieux
        assert.equal(choisi.rang, vise);
        assert.equal(choisi.ouverture, Math.max(...gardeEtOuvre.map((e) => e.ouverture)));
      } else {
        // Sinon le niveau ne baisse jamais plus que nécessaire
        assert.ok(choisi.rang >= Math.min(vise - 1, Math.max(...essais.map((e) => e.rang))));
      }
    }
  });

  test('Diabolique : le niveau est gardé et la grille s\'ouvre (déductions simples possibles d\'emblée)', () => {
    for (const d of diaboliques(4)) {
      const p = logique.preparer(d, ACTIVE);
      assert.equal(logique.noter(p)?.niveau, 'diabolique');
      const id = p.preplaces[0] ?? -1;
      assert.ok(ouverture(d, id) >= OUVERTURE_MIN);
    }
  });

  test('le nombre ajouté a le statut d\'un pré-placé : posé au départ, verrouillé, non modifiable', () => {
    const d = grilles[0];
    assert.ok(d !== undefined);
    const p = logique.preparer(d, ACTIVE);
    const id = p.preplaces[0] ?? -1;
    const nombre = structureDe(p).solutionTexte[id] ?? '';
    const etat = logique.etatInitial(p);
    assert.equal(etat.places[id], nombre);
    assert.ok(estVerrouille(etat, p, nombre));
    const dansListe = groupesListe(AUCUNE, etat, p).flatMap((g) => g.nombres).find((n) => n.texte === nombre);
    assert.equal(dansListe?.etat, 'verrouille');
    assert.equal(logique.appliquer(etat, { type: 'effacer', emplacement: id }, p), etat);
  });

  test('une grille à deux solutions sans pré-placé en reçoit un qui la rend résoluble', () => {
    // GRILLE A : sans pré-placé, elle a deux solutions (la logique ne la résout pas)
    const a = donneesDe(GRILLE_A);
    assert.equal(logique.noter(a), null);
    const p = logique.preparer(a, ACTIVE);
    assert.equal(p.preplaces.length, 1);
    assert.ok(logique.noter(p) !== null);
  });

  test('sudoku : sans objet, données inchangées', () => {
    const r = logiqueSudoku.generer('facile', creerAlea(1), { doitArreter: () => false });
    assert.ok(r.ok);
    assert.equal(logiqueSudoku.preparer(r.donnees, ACTIVE), r.donnees);
  });
});
