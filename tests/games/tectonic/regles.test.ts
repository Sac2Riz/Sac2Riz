// Règles du joueur (appliquer, erreurs, fin de partie), structure de la grille et gardes de type.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { estAction, estDonnees, estEtat, respecteLesRegles } from '../../../src/games/tectonic/gardes.ts';
import { structureDe, valeursAutorisees } from '../../../src/games/tectonic/grille.ts';
import { logique } from '../../../src/games/tectonic/logique.ts';
import type { DonneesTectonic, EtatTectonic } from '../../../src/games/tectonic/types.ts';
import type { Json } from '../../../src/types/json.ts';
import { caseVide, DEBUTANT } from './aide.ts';

const D = DEBUTANT;
const S = structureDe(D);

describe('Tectonic : structure de la grille', () => {
  test('mise en cache, tailles, voisines, chiffres autorisés', () => {
    assert.equal(structureDe({ ...D }), S, 'même tableau de zones → même structure');
    const c = caseVide(D);
    const taille = S.tailleCase[c] ?? 0;
    assert.deepEqual(valeursAutorisees(S, c), Array.from({ length: taille }, (_, i) => i + 1));
    assert.ok(S.voisines[c]?.every((v) => v !== c));
    // Les voisines contiennent la zone entière et les cases qui touchent
    const zone = S.cellulesZones[D.zones[c] ?? 0] ?? [];
    assert.ok(zone.every((z) => z === c || S.voisines[c]?.includes(z)));
    assert.equal(S.tailleMax, Math.max(...S.tailleCase));
    assert.equal(S.bordures.length, D.zones.length);
  });
});

describe('Tectonic : appliquer', () => {
  const depart = logique.etatInitial(D);

  test('placer : chiffre hors de la zone refusé, chiffre permis posé', () => {
    const c = caseVide(D);
    const taille = S.tailleCase[c] ?? 0;
    if (taille < 6) assert.equal(logique.appliquer(depart, { type: 'placer', cellule: c, valeur: taille + 1 }, D), depart);
    const apres = logique.appliquer(depart, { type: 'placer', cellule: c, valeur: 1 }, D);
    assert.equal(apres.valeurs[c], 1);
    assert.equal(depart.valeurs[c], 0, 'pas de mutation');
  });

  test('case donnée ou hors grille : jamais modifiée', () => {
    const donnee = D.enonce.findIndex((v) => v !== 0);
    assert.equal(logique.appliquer(depart, { type: 'effacer', cellule: donnee }, D), depart);
    assert.equal(logique.appliquer(depart, { type: 'placer', cellule: 999, valeur: 1 }, D), depart);
  });

  test('retrait automatique : la note disparaît de la zone et des cases qui touchent, pas ailleurs', () => {
    const c = caseVide(D, 2);
    const vides = D.enonce.flatMap((v, i) => (v === 0 && i !== c ? [i] : []));
    // Note 1 partout où elle est permise
    let etat: EtatTectonic = depart;
    for (const v of vides) etat = logique.appliquer(etat, { type: 'noter', cellule: v, valeur: 1 }, D);
    const avec = logique.appliquer(etat, { type: 'placer', cellule: c, valeur: 1 }, D);
    const sans = logique.appliquer(etat, { type: 'placer-seul', cellule: c, valeur: 1 }, D);
    for (const v of vides) {
      const voisine = S.voisines[c]?.includes(v) ?? false;
      assert.equal(avec.notes[v]?.includes(1), !voisine, `case ${v}`);
      assert.deepEqual(sans.notes[v], etat.notes[v]);
    }
  });

  test('noter : seulement les chiffres permis ; definir-notes filtre aussi', () => {
    const c = caseVide(D);
    const taille = S.tailleCase[c] ?? 0;
    if (taille < 6) assert.equal(logique.appliquer(depart, { type: 'noter', cellule: c, valeur: taille + 1 }, D), depart);
    const defini = logique.appliquer(depart, { type: 'definir-notes', changements: [{ cellule: c, notes: [1, 6] }] }, D);
    assert.deepEqual(defini.notes[c], taille >= 6 ? [1, 6] : [1]);
    const efface = logique.appliquer(defini, { type: 'effacer', cellule: c }, D);
    assert.deepEqual(efface.notes[c], []);
  });

  test('erreurs et fin de partie', () => {
    const c = caseVide(D);
    const faux = (D.solution[c] ?? 1) === 1 ? 2 : 1;
    const etat = logique.appliquer(depart, { type: 'placer', cellule: c, valeur: faux }, D);
    if (etat !== depart) assert.deepEqual(logique.erreurs(etat, D), [c]);
    const fini: EtatTectonic = { valeurs: D.solution, notes: D.solution.map(() => []) };
    assert.ok(logique.estTerminee(fini, D));
    assert.ok(!logique.estTerminee(depart, D));
  });
});

describe('Tectonic : gardes', () => {
  const json = (d: DonneesTectonic): Json => JSON.parse(JSON.stringify(d));
  /** Données de référence modifiées, relues comme du JSON. */
  const modifiees = (modif: Partial<Record<keyof DonneesTectonic, unknown>>): Json => JSON.parse(JSON.stringify({ ...D, ...modif }));

  test('données valides, et règles vérifiées', () => {
    assert.ok(estDonnees(json(D)));
    assert.ok(respecteLesRegles(D.lignes, D.colonnes, D.zones, D.solution));
  });

  test('données refusées', () => {
    const c = caseVide(D);
    // Énoncé incohérent avec la solution
    assert.ok(!estDonnees(modifiees({ enonce: D.enonce.map((v, i) => (i === c ? ((D.solution[c] ?? 1) % 2) + 1 : v)) })));
    // Zones mal numérotées
    assert.ok(!estDonnees(modifiees({ zones: D.zones.map((z) => (z === 0 ? 1 : z === 1 ? 0 : z)) })));
    // Chiffres voisins identiques
    assert.ok(!estDonnees(modifiees({ solution: D.solution.map(() => 1), enonce: D.enonce.map(() => 0) })));
    // Dimensions
    assert.ok(!estDonnees(modifiees({ lignes: 1 })));
    assert.ok(!estDonnees(modifiees({ colonnes: D.colonnes + 1 })));
  });

  test('états et actions', () => {
    const etat: Json = JSON.parse(JSON.stringify(logique.etatInitial(D)));
    assert.ok(estEtat(etat));
    assert.ok(!estEtat({ valeurs: [1, 0, 0, 0], notes: [[1], [], [], []] }), 'note dans une case remplie');
    assert.ok(!estEtat({ valeurs: [0, 0, 0, 0], notes: [[2, 1], [], [], []] }), 'notes non triées');
    assert.ok(estAction({ type: 'placer', cellule: 3, valeur: 5 }));
    assert.ok(estAction({ type: 'definir-notes', changements: [{ cellule: 1, notes: [1, 2] }] }));
    assert.ok(!estAction({ type: 'placer', cellule: 3, valeur: 7 }));
    assert.ok(!estAction({ type: 'definir-notes', changements: [] }));
    assert.ok(!estAction({ type: 'sauter', cellule: 3 }));
  });
});
