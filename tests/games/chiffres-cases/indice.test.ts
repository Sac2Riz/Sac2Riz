// Tests des indices des chiffres casés et du contrat LogiqueJeu (logique seule : la vue arrive en 4b).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { logique } from '../../../src/games/chiffres-cases/logique.ts';
import { META } from '../../../src/games/chiffres-cases/meta.ts';
import { verifierLogique } from '../verifier-module.ts';
import { H1, H3, NIVEAUX_RAPIDES, structureA, V1 } from './aide.ts';

const OPTIONS = { retraitAutoNotes: true };

describe('chiffres casés : indices', () => {
  test('premier indice : placement expliqué, marques de l\'emplacement et de ses chiffres', () => {
    const { donnees } = structureA([H1]);
    const indice = logique.indice(logique.etatInitial(donnees), donnees, OPTIONS);
    assert.ok(indice !== null);
    assert.equal(indice.titre, 'Un seul nombre possible');
    assert.deepEqual(indice.action, { type: 'placer', emplacement: V1, nombre: '146' });
    assert.equal(indice.libelleAction, 'Placer 146');
    assert.deepEqual(indice.marques.cellules, [0, 3, 6]);
    assert.deepEqual(indice.marques.placements, [
      { cellule: 0, valeur: 1 },
      { cellule: 3, valeur: 4 },
      { cellule: 6, valeur: 6 },
    ]);
  });

  test('un nombre faux est signalé en premier (action : l\'effacer)', () => {
    const { donnees } = structureA([H1]);
    const etat = logique.appliquer(logique.etatInitial(donnees), { type: 'placer', emplacement: H3, nombre: '358' }, donnees);
    const indice = logique.indice(etat, donnees, OPTIONS);
    assert.equal(indice?.titre, 'Nombre faux');
    assert.deepEqual(indice?.action, { type: 'effacer', emplacement: H3 });
  });

  test('grille terminée : pas d\'indice ; nom des techniques', () => {
    const { donnees, s } = structureA([H1]);
    assert.equal(logique.indice({ places: s.solutionTexte }, donnees, OPTIONS), null);
    assert.equal(logique.nomTechnique('croisement'), 'Croisement');
    assert.equal(logique.nomTechnique('aucune'), 'Aucune');
  });

  test('contrat LogiqueJeu : niveaux rapides générés, notés et joués jusqu\'au bout par les indices', () => {
    // Expert et Diabolique (plusieurs secondes de génération) : contrôlés dans surete.long.ts
    assert.equal(logique.meta, META);
    verifierLogique(logique, NIVEAUX_RAPIDES);
  });
});
