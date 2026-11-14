// Tests des règles du joueur aux chiffres casés (placer, déplacer, conflits, effacer, erreurs, fin).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { logique } from '../../../src/games/chiffres-cases/logique.ts';
import {
  casesFausses,
  chiffresDesCases,
  consequencesPlacement,
  emplacementsFaux,
  nombresUtilises,
} from '../../../src/games/chiffres-cases/regles.ts';
import type { ActionCases, DonneesCases, EtatCases } from '../../../src/games/chiffres-cases/types.ts';
import { donneesDe, H1, H3, structureA, V1, V3 } from './aide.ts';

function jouer(etat: EtatCases, donnees: DonneesCases, ...actions: ActionCases[]): EtatCases {
  return actions.reduce((e, a) => logique.appliquer(e, a, donnees), etat);
}

const placer = (emplacement: number, nombre: string): ActionCases => ({ type: 'placer', emplacement, nombre });

describe('chiffres casés : règles du joueur', () => {
  test('état initial : seuls les pré-placés sont remplis', () => {
    const { donnees } = structureA([H1]);
    assert.deepEqual(logique.etatInitial(donnees).places, ['123', null, null, null]);
  });

  test('placer un nombre de la liste de la bonne longueur', () => {
    const { donnees } = structureA();
    const etat = jouer(logique.etatInitial(donnees), donnees, placer(V1, '146'));
    assert.deepEqual(etat.places, [null, '146', null, null]);
    assert.deepEqual(chiffresDesCases(etat, donnees), [1, null, null, 4, null, null, 6, null, null]);
  });

  test('nombre hors liste, mauvaise longueur, emplacement inconnu : aucun effet (même état)', () => {
    const { donnees } = structureA();
    const etat = logique.etatInitial(donnees);
    for (const action of [placer(V1, '999'), placer(V1, '12'), placer(9, '146')]) {
      assert.equal(logique.appliquer(etat, action, donnees), etat);
    }
  });

  test('un nombre déjà posé ailleurs est déplacé', () => {
    const { donnees } = structureA();
    const etat = jouer(logique.etatInitial(donnees), donnees, placer(H1, '146'));
    assert.deepEqual(consequencesPlacement(etat, donnees, V1, '146'), { possible: true, deplaceDepuis: H1, conflits: [] });
    assert.deepEqual(jouer(etat, donnees, placer(V1, '146')).places, [null, '146', null, null]);
  });

  test("un nombre qui contredit un nombre croisé n'est pas posé ; le nombre croisé reste (cases en conflit données)", () => {
    const { donnees } = structureA();
    const etat = jouer(logique.etatInitial(donnees), donnees, placer(H1, '123'), placer(H3, '678'));
    // 358 en vertical L1C1 : « 3 » contredit le « 1 » de 123 en L1C1 (case 0), « 8 » contredit le « 6 »
    // de 678 en L3C1 (case 6)
    assert.deepEqual(consequencesPlacement(etat, donnees, V1, '358'), { possible: false, deplaceDepuis: null, conflits: [0, 6] });
    assert.equal(logique.appliquer(etat, placer(V1, '358'), donnees), etat);
    // 146 concorde avec les deux : il est posé
    assert.deepEqual(jouer(etat, donnees, placer(V1, '146')).places, ['123', '146', null, '678']);
  });

  test('un nombre déplacé vers un emplacement en conflit reste à son ancien emplacement', () => {
    const { donnees } = structureA();
    // 123 en H1, 146 en H3 : déplacer 146 en V1 est compatible (« 1 » en L1C1 ; H3 est quitté)…
    const etat = jouer(logique.etatInitial(donnees), donnees, placer(H1, '123'), placer(H3, '146'));
    assert.deepEqual(jouer(etat, donnees, placer(V1, '146')).places, ['123', '146', null, null]);
    // …mais pas 358, posé en H3, qui contredirait 123 en L1C1
    const avec358 = jouer(logique.etatInitial(donnees), donnees, placer(H1, '123'), placer(H3, '358'));
    assert.deepEqual(avec358.places, ['123', null, null, '358']);
    assert.deepEqual(consequencesPlacement(avec358, donnees, V1, '358'), { possible: false, deplaceDepuis: null, conflits: [0] });
    assert.equal(logique.appliquer(avec358, placer(V1, '358'), donnees), avec358);
  });

  test('un pré-placé ne bouge jamais : ni effacé, ni remplacé, ni contredit, ni déplacé', () => {
    const { donnees } = structureA([H1]);
    const etat = logique.etatInitial(donnees);
    for (const action of [
      { type: 'effacer', emplacement: H1 } as const,
      placer(H1, '146'),
      placer(V1, '358'), // contredirait 123 en L1C1
      placer(V3, '123'), // déplacerait 123
    ]) {
      assert.equal(logique.appliquer(etat, action, donnees), etat);
    }
    assert.deepEqual(consequencesPlacement(etat, donnees, V1, '358'), { possible: false, deplaceDepuis: null, conflits: [0] });
  });

  test('effacer un emplacement ; effacer un emplacement vide est sans effet', () => {
    const { donnees } = structureA();
    const etat = jouer(logique.etatInitial(donnees), donnees, placer(V3, '358'));
    assert.deepEqual(jouer(etat, donnees, { type: 'effacer', emplacement: V3 }).places, [null, null, null, null]);
    assert.equal(logique.appliquer(etat, { type: 'effacer', emplacement: V1 }, donnees), etat);
  });

  test('nombres utilisés : posés, ou entièrement écrits par les croisements', () => {
    const { donnees } = structureA();
    const etat = jouer(logique.etatInitial(donnees), donnees, placer(V1, '146'), placer(V3, '358'));
    assert.deepEqual(nombresUtilises(etat, donnees), ['146', '358']);
    // H1 n'est pas posé et « 1·3 » n'est pas complet : 123 n'est pas barré
    const suite = jouer(etat, donnees, placer(H3, '678'));
    assert.deepEqual(nombresUtilises(suite, donnees), ['146', '358', '678']);
  });

  test('un emplacement entièrement écrit par les croisements compte comme utilisé', () => {
    const donnees = donneesDe(['123', '456', '789']);
    // Emplacements : H L1 (0), V C1 (1), V C2 (2), V C3 (3), H L2 (4), H L3 (5)
    const etat = jouer(logique.etatInitial(donnees), donnees, placer(1, '147'), placer(2, '258'), placer(3, '369'));
    assert.deepEqual(nombresUtilises(etat, donnees), ['123', '147', '258', '369', '456', '789']);
    assert.ok(logique.estTerminee(etat, donnees));
  });

  test('erreurs : cases dont le chiffre diffère de la solution ; partie terminée', () => {
    const { donnees } = structureA();
    // La transposée (146 en H1) est cohérente mais n'est pas LA solution
    const fausse = jouer(logique.etatInitial(donnees), donnees, placer(H1, '146'));
    assert.deepEqual(emplacementsFaux(fausse, donnees), [H1]);
    assert.deepEqual(casesFausses(fausse, donnees), [1, 2]);
    assert.equal(logique.estTerminee(fausse, donnees), false);

    const juste = jouer(logique.etatInitial(donnees), donnees, placer(H1, '123'), placer(V1, '146'), placer(V3, '358'), placer(H3, '678'));
    assert.deepEqual(logique.erreurs(juste, donnees), []);
    assert.ok(logique.estTerminee(juste, donnees));
  });

  test('un état d\'une autre grille n\'est jamais modifié', () => {
    const { donnees } = structureA();
    const etranger: EtatCases = { places: [null, null] };
    assert.equal(logique.appliquer(etranger, placer(H1, '123'), donnees), etranger);
  });
});
