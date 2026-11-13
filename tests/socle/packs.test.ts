// Tests du service des packs : jamais la même grille avant épuisement, nouvel ordre ensuite,
// mémoire conservée d'une session à l'autre, tirages simultanés distincts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { estPackSudoku } from '../../src/moteur/pack.ts';
import { avancer, creerServicePacks, nouvelEtatPack, type ChargeurPack } from '../../src/socle/packs.ts';
import { creerStockageMemoire } from '../../src/socle/stockage/memoire.ts';
import type { Puzzle } from '../../src/types/jeu.ts';
import type { Json } from '../../src/types/json.ts';
import type { Niveau } from '../../src/types/niveaux.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { estEtatPack } from '../../src/utils/gardes-sauvegarde.ts';
import { puzzleFactice } from './aide.ts';

const sansJournal = (): void => undefined;

/** Chargeur de test : un pack de « taille » grilles pour le niveau expert seulement. */
function chargeurFactice(taille: number): { charger: ChargeurPack; appels: () => number } {
  let appels = 0;
  const grilles = Array.from({ length: taille }, () => puzzleFactice('jeu-a', 'expert'));
  return {
    charger: async (_jeu, niveau) => {
      appels++;
      return niveau === 'expert' ? grilles : null;
    },
    appels: () => appels,
  };
}

async function tirerN(service: { tirer: (j: string, n: Niveau) => Promise<Puzzle<Json> | null> }, n: number): Promise<number[]> {
  const graines: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = await service.tirer('jeu-a', 'expert');
    assert.ok(p !== null);
    graines.push(p.graine);
  }
  return graines;
}

describe('packs : fonctions pures', () => {
  test('nouvelEtatPack : permutation valide, ne commence pas par la grille à éviter', () => {
    for (let graine = 1; graine <= 200; graine++) {
      const etat = nouvelEtatPack(5, 3, 2, creerAlea(graine));
      assert.ok(estEtatPack(etat));
      assert.notEqual(etat.ordre[0], 3);
      assert.equal(etat.cycle, 2);
    }
    assert.deepEqual(nouvelEtatPack(1, 0, 1, creerAlea(1)).ordre, [0], 'pack d\'une seule grille');
  });

  test('avancer : état neuf, cycle épuisé, taille changée', () => {
    const alea = creerAlea(1);
    const premier = avancer(null, 3, alea);
    assert.equal(premier.etat.position, 1);
    assert.equal(premier.etat.derniere, premier.indice);
    const epuise = { taille: 3, ordre: [0, 1, 2], position: 3, derniere: 2, cycle: 1 };
    const suivant = avancer(epuise, 3, alea);
    assert.equal(suivant.etat.cycle, 2);
    assert.notEqual(suivant.indice, 2);
    const autreTaille = avancer(epuise, 4, alea);
    assert.equal(autreTaille.etat.cycle, 1);
    assert.equal(autreTaille.etat.taille, 4);
  });
});

describe('service des packs', () => {
  test('pas de pack pour ce niveau → null', async () => {
    const { charger } = chargeurFactice(3);
    const service = creerServicePacks({ stockage: creerStockageMemoire(), charger, alea: creerAlea(1), journal: sansJournal });
    assert.equal(await service.tirer('jeu-a', 'moyen'), null);
  });

  test('toutes les grilles servies une fois avant toute répétition, puis nouvel ordre', async () => {
    const { charger, appels } = chargeurFactice(5);
    const service = creerServicePacks({ stockage: creerStockageMemoire(), charger, alea: creerAlea(3), journal: sansJournal });
    const cycle1 = await tirerN(service, 5);
    assert.equal(new Set(cycle1).size, 5, 'cycle 1 : 5 grilles différentes');
    const cycle2 = await tirerN(service, 5);
    assert.equal(new Set(cycle2).size, 5, 'cycle 2 : 5 grilles différentes');
    assert.notEqual(cycle2[0], cycle1[4], 'le nouveau cycle ne recommence pas par la dernière servie');
    assert.equal(appels(), 1, 'pack chargé une seule fois');
  });

  test('la mémoire des grilles jouées survit à une nouvelle session (même stockage)', async () => {
    const stockage = creerStockageMemoire();
    const { charger } = chargeurFactice(6);
    const avant = await tirerN(creerServicePacks({ stockage, charger, alea: creerAlea(1), journal: sansJournal }), 3);
    const apres = await tirerN(creerServicePacks({ stockage, charger, alea: creerAlea(2), journal: sansJournal }), 3);
    assert.equal(new Set([...avant, ...apres]).size, 6);
  });

  test('tirages simultanés : jamais la même grille', async () => {
    const { charger } = chargeurFactice(8);
    const service = creerServicePacks({ stockage: creerStockageMemoire(), charger, alea: creerAlea(4), journal: sansJournal });
    const tirages = await Promise.all(Array.from({ length: 8 }, () => service.tirer('jeu-a', 'expert')));
    assert.equal(new Set(tirages.map((p) => p?.graine)).size, 8);
  });

  test('pack illisible → null, puis nouvel essai de chargement au tirage suivant', async () => {
    let appels = 0;
    const charger: ChargeurPack = async () => {
      appels++;
      if (appels === 1) throw new Error('réseau');
      return [puzzleFactice('jeu-a', 'expert')];
    };
    const messages: string[] = [];
    const service = creerServicePacks({
      stockage: creerStockageMemoire(),
      charger,
      alea: creerAlea(1),
      journal: (m) => messages.push(m),
    });
    assert.equal(await service.tirer('jeu-a', 'expert'), null);
    assert.equal(messages.length, 1);
    assert.ok((await service.tirer('jeu-a', 'expert')) !== null);
  });

  test('vrai pack Expert du sudoku : 200 grilles servies sans répétition, puis un 2e cycle', async () => {
    const texte = readFileSync(new URL('../../src/games/sudoku-classique/packs/expert.json', import.meta.url), 'utf8');
    const pack: unknown = JSON.parse(texte);
    assert.ok(estPackSudoku(pack) && pack.niveau === 'expert');
    // Conversion provisoire (celle du module sudoku arrive à l'étape 3b)
    const grilles: Puzzle<Json>[] = pack.grilles.map((g) => ({
      jeu: 'sudoku-classique',
      graine: g.graine,
      notation: g.notation,
      donnees: { enonce: g.enonce, solution: g.solution },
    }));
    const service = creerServicePacks({
      stockage: creerStockageMemoire(),
      charger: async () => grilles,
      alea: creerAlea(9),
      journal: sansJournal,
    });
    const tirer = async (): Promise<number> => (await service.tirer('sudoku-classique', 'expert'))?.graine ?? -1;
    const cycle1: number[] = [];
    for (let i = 0; i < grilles.length; i++) cycle1.push(await tirer());
    assert.equal(new Set(cycle1).size, grilles.length);
    const suivante = await tirer();
    assert.notEqual(suivante, cycle1.at(-1));
  });
});
