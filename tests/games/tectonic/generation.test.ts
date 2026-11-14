// Génération par niveau, notation, liste des techniques et contrat LogiqueJeu (niveaux rapides).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compterSolutionsAvec } from '../../../src/moteur/backtracking.ts';
import { TECHNIQUES_COMPLEMENTAIRES } from '../../../src/moteur/logique/techniques/complementaires.ts';
import { genererTectonic, PARAMETRES_NIVEAUX } from '../../../src/games/tectonic/generateur.ts';
import { structureDe } from '../../../src/games/tectonic/grille.ts';
import { logique } from '../../../src/games/tectonic/logique.ts';
import { noterTectonic } from '../../../src/games/tectonic/notation.ts';
import { IDS_TECHNIQUES_TECTONIC, nomTechnique, TECHNIQUES_TECTONIC } from '../../../src/games/tectonic/techniques.ts';
import { IDS_TECHNIQUES_COMPLEMENTAIRES } from '../../../src/types/logique.ts';
import { NIVEAUX } from '../../../src/types/niveaux.ts';
import { creerAlea } from '../../../src/utils/alea.ts';
import { verifierLogique } from '../verifier-module.ts';
import { grille, NIVEAUX_RAPIDES } from './aide.ts';

describe('Tectonic : techniques', () => {
  test('liste ordonnée par niveau, sans doublon ; complémentaires dans le bon ordre', () => {
    assert.equal(new Set(IDS_TECHNIQUES_TECTONIC).size, TECHNIQUES_TECTONIC.length);
    for (let i = 1; i < TECHNIQUES_TECTONIC.length; i++) {
      const avant = NIVEAUX.indexOf(TECHNIQUES_TECTONIC[i - 1]?.niveau ?? 'debutant');
      assert.ok(avant <= NIVEAUX.indexOf(TECHNIQUES_TECTONIC[i]?.niveau ?? 'debutant'));
    }
    assert.deepEqual(TECHNIQUES_COMPLEMENTAIRES.map((t) => t.id), [...IDS_TECHNIQUES_COMPLEMENTAIRES]);
    // Chaque niveau a au moins une technique
    for (const n of NIVEAUX) assert.ok(TECHNIQUES_TECTONIC.some((t) => t.niveau === n), n);
    assert.equal(nomTechnique('voisine-commune'), 'Voisine commune');
    assert.equal(nomTechnique('inconnue'), 'inconnue');
  });
});

describe('Tectonic : génération par niveau', () => {
  for (const niveau of NIVEAUX_RAPIDES) {
    test(`${niveau} : niveau exact, solution unique, réglages du niveau respectés`, () => {
      const p = PARAMETRES_NIVEAUX[niveau];
      for (const graine of [1, 2, 3]) {
        const d = grille(niveau, graine);
        assert.equal(d.lignes, p.lignes);
        assert.equal(d.colonnes, p.colonnes);
        const s = structureDe(d);
        assert.ok(s.tailleMax <= p.tailleMax);
        const unique = compterSolutionsAvec(s.contexte.structure, d.enonce, { limite: 2 });
        assert.equal(unique.nombre, 1);
        assert.deepEqual(unique.solution, [...d.solution]);
        assert.equal(noterTectonic(s.contexte, d.enonce)?.niveau, niveau);
        const donnes = d.enonce.filter((v) => v !== 0).length;
        if (p.cibleIndices !== null) assert.ok(donnes >= p.cibleIndices.min, `${donnes} chiffres donnés`);
      }
    });
  }

  test('budget de temps : au moins une tentative, puis arrêt ; sans limite ni budget : erreur', () => {
    let appels = 0;
    const r = genererTectonic('diabolique', creerAlea(1), { doitArreter: () => ++appels > 0 });
    assert.ok(!r.ok);
    assert.ok(appels >= 1);
    assert.throws(() => genererTectonic('debutant', creerAlea(1), { tentativesMax: null }), /budget de temps/);
  });

  test('notation : null quand la logique ne suffit pas (grille vide, plusieurs solutions)', () => {
    const d = grille('debutant', 4);
    assert.equal(noterTectonic(structureDe(d).contexte, d.enonce.map(() => 0)), null);
  });
});

describe('Tectonic : contrat LogiqueJeu (niveaux rapides)', () => {
  test('génération, notation, partie complète par les indices, gardes', () => {
    verifierLogique(logique, NIVEAUX_RAPIDES);
  });
});
