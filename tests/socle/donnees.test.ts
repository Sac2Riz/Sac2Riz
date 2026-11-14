// Tests de l'export / import des données (socle/donnees/) et du remplacement atomique du stockage.
// Le jeu modèle sert de jeu « connu » : ses parties sont rejouées par sa logique à l'import.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { logique as logiqueModele } from '../../src/games/_modele/logique.ts';
import { construireExport, lireDonnees, nomFichierExport, texteExport } from '../../src/socle/donnees/export.ts';
import { analyserImport } from '../../src/socle/donnees/import.ts';
import { jouer, nouvellePartie, versSauvegarde, type Logique } from '../../src/socle/partie.ts';
import { creerStockageMemoire } from '../../src/socle/stockage/memoire.ts';
import { CLE_REGLAGES, type Stockage } from '../../src/socle/stockage/stockage.ts';
import type { Puzzle } from '../../src/types/jeu.ts';
import type { Json } from '../../src/types/json.ts';
import { NIVEAUX } from '../../src/types/niveaux.ts';
import {
  REGLAGES_PAR_DEFAUT,
  type DonneesExportees,
  type EtatPack,
  type PartieSauvegardee,
  type StatsJeu,
} from '../../src/types/sauvegarde.ts';
import { estStatsJeu } from '../../src/utils/gardes-sauvegarde.ts';
import { puzzleFactice } from './aide.ts';

const logique: Logique = logiqueModele;
const LOGIQUES: readonly Logique[] = [logique];
const T0 = 1_000_000;
const DATE = '2026-11-14T10:00:00.000Z';

const puzzle: Puzzle<Json> = {
  jeu: '_modele',
  graine: 1,
  notation: { niveau: 'moyen', force: 5, techniqueMax: 'modele-deduction', details: { casesVides: 2 } },
  donnees: { donnes: [1, 2, 3, 4, 0, 0], solution: [1, 2, 3, 4, 5, 6] },
};

function partieEnCours(): PartieSauvegardee {
  const p = jouer(logique, nouvellePartie(logique, puzzle, T0, DATE, true), { type: 'placer', cellule: 4, valeur: 5 }, T0 + 5000);
  return versSauvegarde(logique, p, T0 + 6000, DATE);
}

function stats(terminees: number): StatsJeu {
  const valeur = Object.fromEntries(
    NIVEAUX.map((n) => [n, { terminees, abandonnees: 1, meilleurTempsMs: terminees > 0 ? 60_000 : null, totalTempsMs: terminees * 90_000, totalForce: terminees * 5 }]),
  );
  if (!estStatsJeu(valeur)) throw new Error('statistiques de test invalides');
  return valeur;
}

const etatPack: EtatPack = { taille: 3, ordre: [2, 0, 1], position: 1, derniere: 2, cycle: 1 };

const donneesExemple: DonneesExportees = {
  reglages: { ...REGLAGES_PAR_DEFAUT, theme: 'sombre', verifierErreurs: true, jeux: { 'jeu-futur': { option: true } } },
  parties: [partieEnCours()],
  stats: { _modele: stats(2) },
  packsJoues: { '_modele/expert': etatPack },
};

async function remplir(stockage: Stockage, donnees: DonneesExportees): Promise<void> {
  await stockage.ecrire('reglages', CLE_REGLAGES, donnees.reglages);
  for (const p of donnees.parties) await stockage.ecrire('parties', p.jeu, p);
  for (const [jeu, s] of Object.entries(donnees.stats)) await stockage.ecrire('stats', jeu, s);
  for (const [cle, e] of Object.entries(donnees.packsJoues)) await stockage.ecrire('packsJoues', cle, e);
}

/** Texte d'un fichier d'export valide, éventuellement modifié. */
function fichier(modifier: (f: Record<string, unknown>, d: Record<string, unknown>) => void = () => undefined): string {
  const f: Record<string, unknown> = JSON.parse(texteExport(construireExport(donneesExemple, new Date(DATE))));
  const d = f['donnees'];
  if (typeof d !== 'object' || d === null) throw new Error('fichier de test invalide');
  // « as » sans risque : objet tout juste relu, qu'on modifie exprès pour fabriquer un mauvais fichier
  modifier(f, d as Record<string, unknown>);
  return JSON.stringify(f);
}

function refuse(texte: string): string {
  const resultat = analyserImport(texte, LOGIQUES);
  assert.equal(resultat.ok, false);
  return resultat.ok ? '' : resultat.message;
}

describe('export', () => {
  test('nom du fichier daté (date locale)', () => {
    assert.equal(nomFichierExport(new Date(2026, 10, 4, 23, 59)), 'sac2riz-sauvegarde-2026-11-04.json');
    assert.equal(nomFichierExport(new Date(2027, 0, 15, 0, 1)), 'sac2riz-sauvegarde-2027-01-15.json');
  });

  test('lireDonnees : réglages, parties, stats, packs (la réserve n\'est pas exportée)', async () => {
    const s = creerStockageMemoire();
    await remplir(s, donneesExemple);
    await s.ecrire('reserve', '_modele/moyen/1-0', { jeu: '_modele', niveau: 'moyen', ajouteLe: DATE, puzzle: puzzleFactice('_modele', 'moyen') });
    assert.deepEqual(await lireDonnees(s), donneesExemple);
  });

  test('stockage vide : réglages par défaut, rien d\'autre', async () => {
    assert.deepEqual(await lireDonnees(creerStockageMemoire()), {
      reglages: REGLAGES_PAR_DEFAUT,
      parties: [],
      stats: {},
      packsJoues: {},
    });
  });

  test('anciens réglages exportés convertis (forme actuelle)', async () => {
    const s = creerStockageMemoire();
    await s.ecrire('reglages', CLE_REGLAGES, { theme: 'clair', verifierErreurs: true });
    assert.deepEqual((await lireDonnees(s)).reglages, { ...REGLAGES_PAR_DEFAUT, theme: 'clair', verifierErreurs: true });
  });

  test('fichier : format, version, date', () => {
    const f = construireExport(donneesExemple, new Date(DATE));
    assert.equal(f.format, 'sac2riz-export');
    assert.equal(f.version, 2);
    assert.equal(f.exporteLe, DATE);
  });
});

describe('import : fichier valide', () => {
  test('aller-retour complet : export → import → mêmes données dans un autre stockage', async () => {
    const source = creerStockageMemoire();
    await remplir(source, donneesExemple);
    const texte = texteExport(construireExport(await lireDonnees(source), new Date(DATE)));

    const resultat = analyserImport(texte, LOGIQUES);
    assert.ok(resultat.ok);
    assert.deepEqual(resultat.resume, { exporteLe: DATE, parties: 1, terminees: 12 });

    const cible = creerStockageMemoire();
    await cible.remplacerDonnees(resultat.donnees);
    assert.deepEqual(await lireDonnees(cible), donneesExemple);
  });

  test('fichier n° 1 (avant l’étape 6a) : réglages à plat convertis, choix conservés', () => {
    const resultat = analyserImport(
      fichier((f, d) => {
        f['version'] = 1;
        d['reglages'] = { theme: 'clair', verifierErreurs: true, miseEnEvidence: false, retraitAutoNotes: false, nombreAuDepart: true };
      }),
      LOGIQUES,
    );
    assert.ok(resultat.ok);
    assert.deepEqual(resultat.donnees.reglages, {
      theme: 'clair',
      verifierErreurs: true,
      miseEnEvidence: false,
      jeux: { 'sudoku-classique': { retraitAutoNotes: false }, 'chiffres-cases': { nombreAuDepart: true } },
    });
  });

  test('fichier n° 2 : une valeur de réglage de jeu d’un autre type est ignorée', () => {
    const resultat = analyserImport(
      fichier((_f, d) => {
        d['reglages'] = { ...REGLAGES_PAR_DEFAUT, jeux: { 'sudoku-classique': { retraitAutoNotes: false, autre: 'texte' } } };
      }),
      LOGIQUES,
    );
    assert.ok(resultat.ok);
    assert.deepEqual(resultat.donnees.reglages.jeux, { 'sudoku-classique': { retraitAutoNotes: false } });
  });

  test('sauvegarde sans partie en cours ni statistiques', () => {
    const resultat = analyserImport(
      fichier((_f, d) => {
        d['parties'] = [];
        d['stats'] = {};
        d['packsJoues'] = {};
      }),
      LOGIQUES,
    );
    assert.ok(resultat.ok);
    assert.deepEqual(resultat.resume, { exporteLe: DATE, parties: 0, terminees: 0 });
  });
});

describe('import : fichiers refusés', () => {
  test('pas du JSON', () => {
    assert.match(refuse('ceci n\'est pas du JSON'), /illisible/);
    assert.match(refuse(''), /illisible/);
  });

  test('autre format', () => {
    assert.match(refuse('{"format":"autre-appli","version":1}'), /pas une sauvegarde Sac2Riz/);
    assert.match(refuse('[1, 2, 3]'), /pas une sauvegarde Sac2Riz/);
    assert.match(refuse('null'), /pas une sauvegarde Sac2Riz/);
  });

  test('version plus récente ou inconnue', () => {
    assert.match(refuse(fichier((f) => (f['version'] = 3))), /version plus récente/);
    assert.match(refuse(fichier((f) => (f['version'] = 0))), /Version de sauvegarde inconnue/);
    assert.match(refuse(fichier((f) => (f['version'] = '1'))), /Version de sauvegarde inconnue/);
  });

  test('date ou données manquantes', () => {
    assert.match(refuse(fichier((f) => delete f['exporteLe'])), /incomplète/);
    assert.match(refuse(fichier((f) => (f['donnees'] = []))), /incomplète/);
  });

  test('réglages abîmés, ou d’une forme qui ne correspond pas à la version du fichier', () => {
    assert.match(refuse(fichier((_f, d) => (d['reglages'] = { theme: 'violet' }))), /réglages/);
    // N° 2 : forme à plat refusée ; valeurs des jeux qui ne sont pas des objets refusées
    assert.match(refuse(fichier((_f, d) => (d['reglages'] = { theme: 'clair', verifierErreurs: true }))), /réglages/);
    assert.match(refuse(fichier((_f, d) => (d['reglages'] = { ...REGLAGES_PAR_DEFAUT, jeux: { x: 1 } }))), /réglages/);
    // N° 1 : forme actuelle refusée
    assert.match(refuse(fichier((f) => (f['version'] = 1))), /réglages/);
  });

  test('parties : abîmée, jeu inconnu, deux pour le même jeu', () => {
    assert.match(refuse(fichier((_f, d) => (d['parties'] = 'rien'))), /parties en cours/);
    assert.match(refuse(fichier((_f, d) => (d['parties'] = [{ jeu: '_modele' }]))), /abîmée/);
    const autreJeu = { ...partieEnCours(), jeu: 'jeu-inconnu', puzzle: { ...puzzle, jeu: 'jeu-inconnu' } };
    assert.match(refuse(fichier((_f, d) => (d['parties'] = [autreJeu]))), /jeu inconnu.*jeu-inconnu/);
    assert.match(refuse(fichier((_f, d) => (d['parties'] = [partieEnCours(), partieEnCours()]))), /deux parties/);
  });

  test('partie qui ne peut pas être rejouée par son jeu', () => {
    const coupInvalide = { ...partieEnCours(), actions: [{ type: 'placer', cellule: 99, valeur: 5 }] };
    assert.match(refuse(fichier((_f, d) => (d['parties'] = [coupInvalide]))), /ne peut pas être reprise/);
    const ancienFormat = { ...partieEnCours(), versionFormat: 999 };
    assert.match(refuse(fichier((_f, d) => (d['parties'] = [ancienFormat]))), /ne peut pas être reprise/);
    const grilleInvalide = { ...partieEnCours(), puzzle: { ...puzzle, donnees: { donnes: [1] } } };
    assert.match(refuse(fichier((_f, d) => (d['parties'] = [grilleInvalide]))), /ne peut pas être reprise/);
  });

  test('statistiques : abîmées, jeu inconnu, clé piège', () => {
    assert.match(refuse(fichier((_f, d) => (d['stats'] = { _modele: { moyen: 3 } }))), /statistiques/);
    assert.match(refuse(fichier((_f, d) => (d['stats'] = { 'jeu-inconnu': stats(1) }))), /jeu inconnu/);
    assert.match(refuse(fichier().replace('"stats": {', '"stats": {"__proto__": {"x": 1},').replace('"stats":{', '"stats":{"__proto__":{"x":1},')), /jeu inconnu/);
  });

  test('avancement dans les packs abîmé', () => {
    assert.match(refuse(fichier((_f, d) => (d['packsJoues'] = { _modele: etatPack }))), /avancement/);
    assert.match(refuse(fichier((_f, d) => (d['packsJoues'] = { '_modele/extreme': etatPack }))), /avancement/);
    assert.match(refuse(fichier((_f, d) => (d['packsJoues'] = { '_modele/expert/x': etatPack }))), /avancement/);
    assert.match(refuse(fichier((_f, d) => (d['packsJoues'] = { '_modele/expert': { ...etatPack, position: 9 } }))), /avancement/);
  });
});

describe('stockage : remplacerDonnees', () => {
  test('remplace tout (parties, stats, réglages, packs) mais garde la réserve', async () => {
    const s = creerStockageMemoire();
    await s.ecrire('parties', 'autre-jeu', { ...partieEnCours(), jeu: 'autre-jeu', puzzle: { ...puzzle, jeu: 'autre-jeu' } });
    await s.ecrire('stats', 'autre-jeu', stats(7));
    await s.ecrire('packsJoues', 'autre-jeu/expert', etatPack);
    const reserve = { jeu: '_modele', niveau: 'moyen' as const, ajouteLe: DATE, puzzle: puzzleFactice('_modele', 'moyen') };
    await s.ecrire('reserve', '_modele/moyen/1-0', reserve);

    await s.remplacerDonnees(donneesExemple);
    assert.deepEqual(await lireDonnees(s), donneesExemple);
    assert.equal(await s.lire('parties', 'autre-jeu'), null);
    assert.equal(await s.lire('stats', 'autre-jeu'), null);
    assert.deepEqual(await s.lire('reserve', '_modele/moyen/1-0'), reserve);
  });

  test('les valeurs sont copiées', async () => {
    const s = creerStockageMemoire();
    const donnees = structuredClone(donneesExemple);
    await s.remplacerDonnees(donnees);
    assert.notEqual(await s.lire('stats', '_modele'), donnees.stats['_modele']);
  });

  test('stockage fermé : erreur, rien n\'est modifié', async () => {
    const s = creerStockageMemoire();
    await remplir(s, { ...donneesExemple, parties: [] });
    const avant = structuredClone(s.brut);
    s.fermer();
    await assert.rejects(s.remplacerDonnees(donneesExemple));
    assert.deepEqual(s.brut, avant);
  });
});
