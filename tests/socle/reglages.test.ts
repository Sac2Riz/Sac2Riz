// Tests des réglages : conversion des réglages enregistrés par une ancienne version (migration vers
// les réglages par section, étape 6a), relecture par le stockage, réglages propres à un jeu.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { META as META_CASES } from '../../src/games/chiffres-cases/meta.ts';
import { META as META_SUDOKU } from '../../src/games/sudoku-classique/meta.ts';
import {
  ANCIENS_REGLAGES_DE_JEU,
  changerReglageJeu,
  normaliserReglages,
  reglagesDuJeu,
  reglagesVue,
} from '../../src/socle/reglages.ts';
import { creerStockageMemoire } from '../../src/socle/stockage/memoire.ts';
import { CLE_REGLAGES } from '../../src/socle/stockage/stockage.ts';
import {
  REGLAGES_PAR_DEFAUT,
  type Reglages,
  type ReglagesEnregistres,
  type ReglagesV2,
  type ReglagesV3,
} from '../../src/types/sauvegarde.ts';
import { estReglages } from '../../src/utils/gardes-sauvegarde.ts';

/** Écrit des réglages dans un stockage neuf puis les relit, comme au démarrage de l'appli. */
async function relire(enregistres: ReglagesEnregistres): Promise<Reglages> {
  const stockage = creerStockageMemoire();
  await stockage.ecrire('reglages', CLE_REGLAGES, enregistres);
  const reglages = normaliserReglages(await stockage.lire('reglages', CLE_REGLAGES));
  assert.ok(estReglages(reglages), 'forme actuelle valide');
  return reglages;
}

describe('réglages : migration des anciennes formes', () => {
  test('aucun réglage enregistré : valeurs par défaut', () => {
    assert.deepEqual(normaliserReglages(null), REGLAGES_PAR_DEFAUT);
    assert.deepEqual(REGLAGES_PAR_DEFAUT, { theme: 'systeme', verifierErreurs: false, miseEnEvidence: true, jeux: {} });
  });

  test('les anciens réglages de jeu correspondent bien aux réglages déclarés par ces jeux', () => {
    const metas = [META_SUDOKU, META_CASES];
    for (const [jeu, id] of Object.values(ANCIENS_REGLAGES_DE_JEU)) {
      const meta = metas.find((m) => m.id === jeu);
      assert.ok(meta?.reglages.some((r) => r.id === id), `${jeu} déclare ${id}`);
    }
  });

  test("étape 3b (V1) : thème et vérification conservés, le reste par défaut", async () => {
    const reglages = await relire({ theme: 'sombre', verifierErreurs: true });
    assert.deepEqual(reglages, { theme: 'sombre', verifierErreurs: true, miseEnEvidence: true, jeux: {} });
    assert.equal(reglagesDuJeu(reglages, META_SUDOKU)['retraitAutoNotes'], true);
    assert.equal(reglagesDuJeu(reglages, META_CASES)['nombreAuDepart'], false);
  });

  test('étapes 3c à 4b (V2) : retrait des notes rangé sous le sudoku', async () => {
    const anciens: ReglagesV2 = { theme: 'clair', verifierErreurs: false, miseEnEvidence: false, retraitAutoNotes: false };
    assert.deepEqual(await relire(anciens), {
      theme: 'clair',
      verifierErreurs: false,
      miseEnEvidence: false,
      jeux: { 'sudoku-classique': { retraitAutoNotes: false } },
    });
  });

  test('étapes 4b à 5 (V3) : chaque réglage de jeu rangé sous son jeu, choix conservés', async () => {
    const anciens: ReglagesV3 = {
      theme: 'sombre',
      verifierErreurs: true,
      miseEnEvidence: false,
      retraitAutoNotes: false,
      nombreAuDepart: true,
    };
    const reglages = await relire(anciens);
    assert.deepEqual(reglages, {
      theme: 'sombre',
      verifierErreurs: true,
      miseEnEvidence: false,
      jeux: { 'sudoku-classique': { retraitAutoNotes: false }, 'chiffres-cases': { nombreAuDepart: true } },
    });
    assert.deepEqual(reglagesDuJeu(reglages, META_SUDOKU), { retraitAutoNotes: false });
    assert.deepEqual(reglagesDuJeu(reglages, META_CASES), { nombreAuDepart: true });
  });

  test('forme actuelle : relue telle quelle (jeu inconnu conservé)', async () => {
    const choisis: Reglages = {
      theme: 'clair',
      verifierErreurs: true,
      miseEnEvidence: false,
      jeux: { 'chiffres-cases': { nombreAuDepart: true }, 'jeu-futur': { option: true } },
    };
    assert.deepEqual(await relire(choisis), choisis);
  });

  test("forme actuelle : une valeur d'un autre type est ignorée, les autres restent", async () => {
    const stockage = creerStockageMemoire();
    await stockage.ecrire('reglages', CLE_REGLAGES, {
      theme: 'clair',
      verifierErreurs: false,
      miseEnEvidence: true,
      jeux: { 'sudoku-classique': { retraitAutoNotes: false, inconnu: 'texte' } },
    });
    assert.deepEqual(normaliserReglages(await stockage.lire('reglages', CLE_REGLAGES)).jeux, {
      'sudoku-classique': { retraitAutoNotes: false },
    });
  });

  test('réglages illisibles : ignorés par le stockage, valeurs par défaut', async () => {
    const stockage = creerStockageMemoire();
    // Contourne le typage pour simuler une donnée abîmée (le stockage en mémoire ne vérifie qu'à la lecture)
    const abimes: unknown = { theme: 'violet', verifierErreurs: true };
    await stockage.ecrire('reglages', CLE_REGLAGES, abimes as ReglagesEnregistres);
    assert.deepEqual(normaliserReglages(await stockage.lire('reglages', CLE_REGLAGES)), REGLAGES_PAR_DEFAUT);
  });
});

describe('réglages propres à un jeu', () => {
  test('valeurs par défaut déclarées par le jeu, puis changement', () => {
    assert.deepEqual(reglagesDuJeu(REGLAGES_PAR_DEFAUT, META_SUDOKU), { retraitAutoNotes: true });
    const changes = changerReglageJeu(REGLAGES_PAR_DEFAUT, 'sudoku-classique', 'retraitAutoNotes', false);
    assert.deepEqual(reglagesDuJeu(changes, META_SUDOKU), { retraitAutoNotes: false });
    assert.deepEqual(REGLAGES_PAR_DEFAUT.jeux, {}, 'pas de mutation');
    // Les réglages des autres jeux ne bougent pas
    const deux = changerReglageJeu(changes, 'chiffres-cases', 'nombreAuDepart', true);
    assert.deepEqual(deux.jeux, { 'sudoku-classique': { retraitAutoNotes: false }, 'chiffres-cases': { nombreAuDepart: true } });
  });

  test('vue du jeu : réglages communs et réglages du jeu', () => {
    const reglages: Reglages = { ...REGLAGES_PAR_DEFAUT, verifierErreurs: true, jeux: { 'chiffres-cases': { nombreAuDepart: true } } };
    assert.deepEqual(reglagesVue(reglages, META_CASES), { verifierErreurs: true, miseEnEvidence: true, jeu: { nombreAuDepart: true } });
    assert.deepEqual(reglagesVue(reglages, META_SUDOKU).jeu, { retraitAutoNotes: true });
  });
});
