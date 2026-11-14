// Tests du bilan de fin de partie (code pur) : lignes affichées et message sur le record.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { lignesBilan, messageRecord, type BilanFin } from '../../src/socle/bilan-fin.ts';

const bilan: BilanFin = {
  jeu: 'sudoku-classique',
  niveau: 'expert',
  force: 9,
  tempsMs: 754_000,
  technique: 'X-Wing',
  indicesUtilises: 0,
  nouveauRecord: false,
  ancienRecordMs: 600_000,
};

describe('bilan de fin de partie', () => {
  test('temps, niveau avec la force exacte, technique, indices', () => {
    assert.deepEqual(lignesBilan(bilan), [
      { libelle: 'Temps', valeur: '12:34' },
      { libelle: 'Niveau', valeur: 'Expert · Force 9' },
      { libelle: 'Technique la plus difficile', valeur: 'X-Wing' },
      { libelle: 'Indices utilisés', valeur: '0' },
    ]);
  });

  test('record : nouveau, premier, non pris en compte (indices), rappel', () => {
    assert.match(messageRecord({ ...bilan, nouveauRecord: true }), /^Nouveau record ! Ancien meilleur temps : 10:00\.$/);
    assert.match(messageRecord({ ...bilan, nouveauRecord: true, ancienRecordMs: null }), /première grille/);
    assert.match(messageRecord({ ...bilan, indicesUtilises: 2 }), /non pris en compte/);
    assert.equal(messageRecord(bilan), 'Meilleur temps à ce niveau : 10:00.');
    assert.equal(messageRecord({ ...bilan, ancienRecordMs: null }), '');
  });
});
