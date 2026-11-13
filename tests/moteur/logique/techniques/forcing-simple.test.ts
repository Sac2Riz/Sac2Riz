import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { forcingSimple } from '../../../../src/moteur/logique/techniques/forcing-simple.ts';
import { cases, ctx9, eliminations, etatVide, fixer, motif, partout } from '../aide.ts';

describe('forcing-simple', () => {
  test('les deux hypothèses sur L1C1 {1,2} mènent aux mêmes éliminations', () => {
    // Si L1C1 = 1 : L1C2 = 3 puis L2C1 = 2. Si L1C1 = 2 : L2C1 = 3 puis L1C2 = 1.
    // Dans les deux cas, 1, 2 et 3 occupent L1C1, L1C2 et L2C1 ; le 1 est dans la ligne 1
    // (L1C1 ou L1C2) et le 2 dans la colonne 1 (L1C1 ou L2C1).
    const etat = fixer(etatVide(), { L1C1: [1, 2], L1C2: [1, 3], L2C1: [2, 3] });
    const etape = forcingSimple.chercher(ctx9, etat);
    assert.deepEqual(motif(etape), ['L1C1']);
    assert.deepEqual(eliminations(etape), {
      ...partout(['L1C3', 'L2C2', 'L2C3', 'L3C1', 'L3C2', 'L3C3'], [1, 2, 3]),
      ...partout(cases('L1', 4, 9), [1]),
      ...partout(cases('C1', 4, 9), [2]),
    });
    assert.equal(etape?.niveau, 'diabolique');
    assert.match(etape?.explication ?? '', /^Forcing à partir de L1C1 \{1, 2\} : en supposant 1, puis 2/);
  });

  test("n'utilise pas le raisonnement par contradiction", () => {
    // L1C1 = 1 vide L1C2 (contradiction) : on ne conclut PAS pour autant L1C1 = 2
    const etat = fixer(etatVide(), { L1C1: [1, 2], L1C2: [1] });
    assert.equal(forcingSimple.chercher(ctx9, etat), null);
  });

  test('rien sans case à deux candidats', () => {
    assert.equal(forcingSimple.chercher(ctx9, etatVide()), null);
  });
});
