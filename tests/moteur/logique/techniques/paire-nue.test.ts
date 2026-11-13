import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { creerContexte } from '../../../../src/moteur/logique/contexte.ts';
import { paireNue } from '../../../../src/moteur/logique/techniques/paire-nue.ts';
import { cage } from '../../../../src/moteur/regions.ts';
import { c, cases, ctx9, def9, eliminations, etatVide, fixer, motif, partout, retirer } from '../aide.ts';

const sauf = (noms: readonly string[], exclus: readonly string[]): string[] => noms.filter((n) => !exclus.includes(n));
const ligne1 = cases('L1', 1, 9);
const ligne5 = cases('L5', 1, 9);

describe('paire-nue', () => {
  test('deux cases {2, 7} dans une ligne : on retire 2 et 7 du reste de la ligne', () => {
    const etape = paireNue.chercher(ctx9, fixer(etatVide(), { L1C1: [2, 7], L1C4: [2, 7] }));
    assert.deepEqual(motif(etape), ['L1C1', 'L1C4']);
    assert.deepEqual(eliminations(etape), partout(sauf(ligne1, ['L1C1', 'L1C4']), [2, 7]));
    assert.equal(etape?.niveau, 'moyen');
    assert.deepEqual(etape?.candidatsMotif, [
      { cellule: c('L1C1'), valeurs: [2, 7] },
      { cellule: c('L1C4'), valeurs: [2, 7] },
    ]);
    assert.match(etape?.explication ?? '', /^Dans la ligne 1, L1C1 et L1C4 forment une paire nue \{2, 7\}/);
  });

  test("motif sans effet (2 et 7 déjà absents du reste de la ligne) : ignoré", () => {
    let etat = fixer(etatVide(), { L1C1: [2, 7], L1C4: [2, 7] });
    etat = retirer(retirer(etat, sauf(ligne1, ['L1C1', 'L1C4']), 2), sauf(ligne1, ['L1C1', 'L1C4']), 7);
    assert.equal(paireNue.chercher(ctx9, etat), null);
  });

  test('un motif sans effet est sauté et la recherche continue jusqu\'au motif utile', () => {
    let etat = fixer(etatVide(), { L1C1: [2, 7], L1C4: [2, 7], L5C2: [4, 9], L5C8: [4, 9] });
    etat = retirer(retirer(etat, sauf(ligne1, ['L1C1', 'L1C4']), 2), sauf(ligne1, ['L1C1', 'L1C4']), 7);
    const etape = paireNue.chercher(ctx9, etat);
    assert.deepEqual(motif(etape), ['L5C2', 'L5C8']);
    assert.deepEqual(eliminations(etape), partout(sauf(ligne5, ['L5C2', 'L5C8']), [4, 9]));
  });

  test("ne garde que les candidats encore présents", () => {
    const etat = retirer(fixer(etatVide(), { L1C1: [2, 7], L1C4: [2, 7] }), ['L1C9'], 7);
    assert.deepEqual(eliminations(paireNue.chercher(ctx9, etat)).L1C9, [2]);
  });

  test('fonctionne dans une cage à chiffres distincts (Killer)', () => {
    const ctx = creerContexte({ ...def9, regions: [...def9.regions, cage([c('L1C1'), c('L5C5'), c('L9C9')], 15)] });
    const etape = paireNue.chercher(ctx, fixer(etatVide(ctx), { L1C1: [1, 2], L5C5: [1, 2] }, ctx));
    assert.deepEqual(eliminations(etape, ctx), { L9C9: [1, 2] });
    assert.deepEqual(etape?.regions, [27]);
    assert.match(etape?.explication ?? '', /^Dans la cage 1/);
  });

  test('rien sans paire', () => {
    assert.equal(paireNue.chercher(ctx9, etatVide()), null);
    assert.equal(paireNue.chercher(ctx9, fixer(etatVide(), { L1C1: [2, 7], L1C4: [2, 8] })), null);
  });
});
