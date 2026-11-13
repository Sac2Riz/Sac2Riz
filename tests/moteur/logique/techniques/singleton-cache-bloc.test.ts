import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { etatInitial } from '../../../../src/moteur/logique/etat.ts';
import { singletonCacheBloc } from '../../../../src/moteur/logique/techniques/singleton-cache-bloc.ts';
import { c, cases, ctx9, etatVide, placements, retirerSauf } from '../aide.ts';

/** Grille où le 5 est placé en L2C5, L3C8, L5C2 et L8C3 : dans le bloc 1, le 5 ne peut aller qu'en L1C1. */
function etatBalayage() {
  const valeurs = new Array<number>(81).fill(0);
  for (const nom of ['L2C5', 'L3C8', 'L5C2', 'L8C3']) valeurs[c(nom)] = 5;
  return etatInitial(ctx9, valeurs);
}

/** État où, dans la ligne 1, le 7 n'a plus que la place L1C5 (mais plusieurs places dans chaque bloc). */
const etatLigne = retirerSauf(etatVide(), [cases('L1', 1, 9)], 7, ['L1C5']);

describe('singleton-cache-bloc', () => {
  test('trouve le singleton caché par balayage du bloc', () => {
    const etape = singletonCacheBloc.chercher(ctx9, etatBalayage());
    assert.deepEqual(placements(etape), { L1C1: 5 });
    assert.equal(etape?.niveau, 'debutant');
    assert.deepEqual(etape?.regions, [18]);
    assert.match(etape?.explication ?? '', /^Le bloc 1 : le 5 ne peut aller qu'en L1C1\./);
  });

  test("ignore les singletons cachés qui ne sont que dans une ligne", () => {
    assert.equal(singletonCacheBloc.chercher(ctx9, etatLigne), null);
    assert.equal(singletonCacheBloc.chercher(ctx9, etatVide()), null);
  });
});
