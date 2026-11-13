import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { deuxStringKite } from '../../../../src/moteur/logique/techniques/2-string-kite.ts';
import { skyscraper } from '../../../../src/moteur/logique/techniques/skyscraper.ts';
import { cases, ctx9, eliminations, etatVide, motif, retirerSauf } from '../aide.ts';

/** Le 1 n'a que deux places dans la ligne 1 et dans la colonne 1. */
function ligneEtColonne(placesLigne: string[], placesColonne: string[]) {
  return retirerSauf(retirerSauf(etatVide(), [cases('L1', 1, 9)], 1, placesLigne), [cases('C1', 1, 9)], 1, placesColonne);
}

describe('2-string-kite', () => {
  test('lien fort dans la ligne 1 et dans la colonne 1, reliés par le bloc 1', () => {
    const etat = ligneEtColonne(['L1C2', 'L1C8'], ['L3C1', 'L7C1']);
    const etape = deuxStringKite.chercher(ctx9, etat);
    assert.deepEqual(motif(etape), ['L1C8', 'L1C2', 'L3C1', 'L7C1']);
    assert.deepEqual(eliminations(etape), { L7C8: [1] });
    assert.equal(etape?.niveau, 'difficile');
    assert.match(etape?.explication ?? '', /\(le bloc 1\), donc L1C8 ou L7C1 contient le 1/);
    // Ce n'est pas un skyscraper (une ligne et une colonne)
    assert.equal(skyscraper.chercher(ctx9, etat), null);
  });

  test('rien si les extrémités ne partagent pas de bloc', () => {
    assert.equal(deuxStringKite.chercher(ctx9, ligneEtColonne(['L1C5', 'L1C8'], ['L3C1', 'L7C1'])), null);
  });
});
