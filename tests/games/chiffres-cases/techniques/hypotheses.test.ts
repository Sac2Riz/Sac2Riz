// Tests des techniques par hypothèses (Diabolique) : « conséquences directes » et « hypothèses ».
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { genererCases } from '../../../../src/games/chiffres-cases/generateur.ts';
import { structureDe } from '../../../../src/games/chiffres-cases/probleme.ts';
import { etatDepart, type EtatSolveur } from '../../../../src/games/chiffres-cases/solveur/etat.ts';
import {
  appliquerEtape,
  chercherHypothese,
  IMPASSE_ETAPES_MAX,
  propager,
  TECHNIQUES_IMPASSE,
} from '../../../../src/games/chiffres-cases/solveur/hypotheses.ts';
import { prochaineEtape, techniquesJusqua } from '../../../../src/games/chiffres-cases/solveur/solveur.ts';
import { consequence } from '../../../../src/games/chiffres-cases/solveur/techniques/consequence.ts';
import { creerAlea } from '../../../../src/utils/alea.ts';
import { forcing } from '../../../../src/games/chiffres-cases/solveur/techniques/forcing.ts';
import { etatAvec, H1, n, structureA } from '../aide.ts';

describe('techniques par hypothèses', () => {
  test('conséquences directes : une possibilité qui mène à une impasse est éliminée', () => {
    const { p } = structureA();
    // Si 146 allait en H1, le vertical L1C1 perdrait 146 (déjà pris) et 358 (ne commence pas par 1) : impasse
    const etat = etatAvec(p, [['123', '146'], ['146', '358'], ['358', '678'], ['358', '678']]);
    const etape = consequence.chercher(p, etat);
    assert.ok(etape !== null);
    assert.equal(etape.niveau, 'diabolique');
    assert.deepEqual(etape.motif, [H1]);
    assert.deepEqual(etape.eliminations, [{ emplacement: H1, nombres: [n(p, '146')] }]);
    assert.match(etape.explication, /ne peut recevoir que 123 ou 146\. Mais si 146 y allait, on aboutirait immédiatement à une impasse/);
  });

  test('propagation bornée : arrêt après etapesMax étapes', () => {
    const { p, donnees } = structureA([H1]);
    const depart = etatDepart(p, [{ emplacement: H1, nombre: n(p, donnees.solution.slice(0, 3).join('')) }]);
    const complete = propager(p, depart, TECHNIQUES_IMPASSE);
    assert.equal(complete.statut, 'resolu');
    assert.ok(complete.etapes >= 2);
    const bornee = propager(p, depart, TECHNIQUES_IMPASSE, 1);
    assert.deepEqual([bornee.statut, bornee.etapes], ['bloque', 1]);
  });

  test('une impasse trop longue (au-delà de IMPASSE_ETAPES_MAX déductions) est ignorée', () => {
    // Graine 38 (Difficile) : en la résolvant, on rencontre une situation où la seule impasse
    // demande plus de IMPASSE_ETAPES_MAX déductions simples. Si le générateur change, choisir
    // une autre graine (le test le signale).
    const r = genererCases('difficile', creerAlea(38), { tentativesMax: 1000 });
    assert.ok(r.ok);
    const { probleme: p, solution } = structureDe(r.donnees);
    const options = (impasseEtapesMax: number) => ({
      possibilitesMax: 2,
      parNombre: false,
      absurde: true,
      impasseEtapesMax,
      techniques: [],
    });
    const infos = { id: 'consequence', niveau: 'diabolique' } as const;
    let etat: EtatSolveur = etatDepart(p, r.donnees.preplaces.map((e) => ({ emplacement: e, nombre: solution[e] ?? -1 })));
    let longue: string | null = null;
    for (let i = 0; i < 200 && longue === null; i++) {
      const sansBorne = chercherHypothese(infos, p, etat, options(50), '');
      if (sansBorne !== null && chercherHypothese(infos, p, etat, options(IMPASSE_ETAPES_MAX), '') === null) {
        longue = sansBorne.explication;
      }
      const etape = prochaineEtape(p, etat, techniquesJusqua('expert'));
      if (etape === null) break;
      etat = appliquerEtape(p, etat, etape);
    }
    assert.ok(longue !== null, 'aucune impasse longue rencontrée : changer de graine');
    const deductions = Number(/après (\d+) déductions simples/.exec(longue)?.[1]);
    assert.ok(deductions > IMPASSE_ETAPES_MAX);
  });

  test('hypothèses : la même impasse est trouvée en poursuivant le raisonnement', () => {
    const { p } = structureA();
    const etat = etatAvec(p, [['123', '146'], ['146', '358'], ['358', '678'], ['358', '678']]);
    assert.deepEqual(forcing.chercher(p, etat)?.eliminations, [{ emplacement: H1, nombres: [n(p, '146')] }]);
  });

  test('hypothèses : aucune conclusion quand les possibilités mènent à des solutions différentes', () => {
    const { p } = structureA();
    // Grille A sans pré-placé : 123 en H1 mène à la solution directe, 146 à la transposée
    // (H3 = 678 dans l'une, 358 dans l'autre) : rien n'est vrai dans tous les cas.
    const etat = etatAvec(p, [['123', '146'], ['123', '146'], ['358', '678'], ['358', '678']]);
    assert.equal(forcing.chercher(p, etat), null);
  });

  test('aucune hypothèse possible sans emplacement à 2 nombres', () => {
    const { p } = structureA();
    const etat = etatAvec(p, [['123', '146', '358'], ['123', '146', '358'], ['123', '358', '678'], ['146', '358', '678']]);
    assert.equal(consequence.chercher(p, etat), null);
  });
});
