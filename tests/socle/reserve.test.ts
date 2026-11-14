// Tests de la réserve de grilles : réalimentation et son ordre, grille jamais servie deux fois,
// bascule sur le pack, génération urgente relancée, annulation, délais de relance après échec.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Priorite, ResultatDemande } from '../../src/socle/client-worker.ts';
import { creerServicePacks, type ChargeurPack } from '../../src/socle/packs.ts';
import {
  budgetFond,
  creerServiceReserve,
  estPackSeul,
  ordreReapprovisionnement,
  type JeuReserve,
} from '../../src/socle/reserve.ts';
import { creerStockageMemoire } from '../../src/socle/stockage/memoire.ts';
import { prefixeReserve } from '../../src/socle/stockage/stockage.ts';
import { NIVEAUX, type Niveau } from '../../src/types/niveaux.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { FauxGenerateur, HorlogeFactice, laisserFiler, puzzleFactice } from './aide.ts';

const JEUX: readonly JeuReserve[] = [
  { id: 'jeu-a', niveaux: NIVEAUX, generation: {} },
  { id: 'jeu-b', niveaux: ['moyen', 'facile'], generation: {} },
];

/** Packs : 10 grilles pour jeu-a en Expert et Diabolique, rien ailleurs. */
const chargerPacks: ChargeurPack = async (jeu, niveau) =>
  jeu === 'jeu-a' && (niveau === 'expert' || niveau === 'diabolique')
    ? Array.from({ length: 10 }, () => puzzleFactice(jeu, niveau))
    : null;

/** jeu-c : Expert avec un budget de fond de 30 s, Diabolique servi uniquement par son pack. */
const JEU_C: JeuReserve = {
  id: 'jeu-c',
  niveaux: ['moyen', 'expert', 'diabolique'],
  generation: { expert: { mode: 'worker', budgetFondMs: 30_000 }, diabolique: { mode: 'pack' } },
};

function preparer(jeux: readonly JeuReserve[] = JEUX, charger: ChargeurPack = chargerPacks) {
  const horloge = new HorlogeFactice();
  const stockage = creerStockageMemoire();
  const generateur = new FauxGenerateur();
  const packs = creerServicePacks({ stockage, charger, alea: creerAlea(1), journal: () => undefined });
  const reserve = creerServiceReserve({
    stockage,
    generateur,
    packs,
    jeux,
    programmer: horloge.programmer,
    maintenant: horloge.maintenant,
    journal: () => undefined,
  });
  const compter = (jeu: string, niveau: Niveau): Promise<number> => stockage.compter('reserve', prefixeReserve(jeu, niveau));
  return { horloge, stockage, generateur, reserve, compter };
}

/** Politique : tout réussit, sauf ce que « sinon » décide (null = laisser en attente). */
function politique(
  sinon: (jeu: string, niveau: Niveau, priorite: Priorite) => ResultatDemande | null | 'ok',
): (jeu: string, niveau: Niveau, priorite: Priorite) => ResultatDemande | null {
  return (jeu, niveau, priorite) => {
    const r = sinon(jeu, niveau, priorite);
    return r === 'ok' ? { statut: 'ok', puzzle: puzzleFactice(jeu, niveau) } : r;
  };
}

describe('ordre de réalimentation', () => {
  test('jeu et niveau en cours, puis ses autres niveaux du plus facile au plus difficile, puis les autres jeux', () => {
    const ordre = ordreReapprovisionnement(JEUX, { jeu: 'jeu-a', niveau: 'difficile' }).map((c) => `${c.jeu}/${c.niveau}`);
    assert.deepEqual(ordre, [
      'jeu-a/difficile',
      'jeu-a/debutant',
      'jeu-a/facile',
      'jeu-a/moyen',
      'jeu-a/expert',
      'jeu-a/diabolique',
      'jeu-b/facile',
      'jeu-b/moyen',
    ]);
  });
});

describe('réglages de génération par niveau (MetaJeu.generation)', () => {
  const chargerJeuC: ChargeurPack = async (jeu, niveau) =>
    jeu === 'jeu-c' && niveau === 'diabolique' ? Array.from({ length: 5 }, () => puzzleFactice(jeu, niveau)) : null;

  test('estPackSeul et budgetFond lisent les réglages ; niveau absent = fonctionnement par défaut', () => {
    const jeux = [...JEUX, JEU_C];
    assert.equal(estPackSeul(jeux, { jeu: 'jeu-c', niveau: 'diabolique' }), true);
    assert.equal(estPackSeul(jeux, { jeu: 'jeu-c', niveau: 'expert' }), false);
    assert.equal(estPackSeul(jeux, { jeu: 'jeu-a', niveau: 'diabolique' }), false);
    assert.equal(budgetFond(jeux, { jeu: 'jeu-c', niveau: 'expert' }), 30_000);
    assert.equal(budgetFond(jeux, { jeu: 'jeu-c', niveau: 'moyen' }), null);
    assert.equal(budgetFond(jeux, { jeu: 'jeu-c', niveau: 'diabolique' }), null);
  });

  test('un niveau « pack » est exclu de la réalimentation, même quand il est en cours', () => {
    const ordre = ordreReapprovisionnement([JEU_C], { jeu: 'jeu-c', niveau: 'diabolique' }).map((c) => c.niveau);
    assert.deepEqual(ordre, ['moyen', 'expert']);
  });

  test('réalimentation : jamais de niveau « pack », budget de fond propre au niveau sinon', async () => {
    const { generateur, reserve, compter } = preparer([JEU_C], chargerJeuC);
    reserve.reapprovisionner('jeu-c', 'diabolique');
    await reserve.auRepos();
    assert.equal(await compter('jeu-c', 'diabolique'), 0);
    assert.ok(generateur.demandes.every((d) => d.niveau !== 'diabolique'));
    const budgets = new Set(generateur.demandes.map((d) => `${d.niveau}:${String(d.budgetMs)}`));
    assert.deepEqual([...budgets].sort(), ['expert:30000', 'moyen:null']);
  });

  test('niveau « pack » : servi par le pack, jamais par une génération urgente', async () => {
    const { generateur, reserve } = preparer([JEU_C], chargerJeuC);
    generateur.politique = () => null;
    const r = await reserve.obtenirGrille('jeu-c', 'diabolique').resultat;
    assert.ok(r.statut === 'ok');
    assert.equal(r.origine, 'pack');
    assert.ok(generateur.demandes.every((d) => d.niveau !== 'diabolique'));
    reserve.arreter();
  });

  test('niveau « pack » sans pack lisible : erreur claire, aucune génération', async () => {
    const { generateur, reserve } = preparer([JEU_C], async () => null);
    generateur.politique = () => null;
    const r = await reserve.obtenirGrille('jeu-c', 'diabolique').resultat;
    assert.equal(r.statut, 'erreur');
    assert.ok(generateur.demandes.every((d) => d.niveau !== 'diabolique'));
    reserve.arreter();
  });

  test('génération urgente : budget par défaut (null), même si le niveau a un budget de fond', async () => {
    const { generateur, reserve } = preparer([JEU_C], async () => null);
    generateur.politique = politique((_j, _n, priorite) => (priorite === 'urgent' ? 'ok' : null));
    const r = await reserve.obtenirGrille('jeu-c', 'expert').resultat;
    assert.ok(r.statut === 'ok');
    assert.equal(generateur.demandes.find((d) => d.priorite === 'urgent')?.budgetMs, null);
    reserve.arreter();
  });
});

describe('réserve de grilles', () => {
  test('se réalimente jusqu\'à 3 grilles partout, dans l\'ordre prévu, en priorité « fond »', async () => {
    const { generateur, reserve, compter } = preparer();
    reserve.reapprovisionner('jeu-b', 'moyen');
    await reserve.auRepos();
    for (const jeu of JEUX) for (const niveau of jeu.niveaux) assert.equal(await compter(jeu.id, niveau), 3);
    const ordre = generateur.demandes.map((d) => `${d.jeu}/${d.niveau}`);
    assert.deepEqual(ordre.slice(0, 6), [...Array<string>(3).fill('jeu-b/moyen'), ...Array<string>(3).fill('jeu-b/facile')]);
    assert.equal(ordre[6], 'jeu-a/debutant');
    assert.ok(generateur.demandes.every((d) => d.priorite === 'fond'));
    assert.equal(generateur.demandes.length, 8 * 3);
  });

  test('obtenirGrille sert la plus ancienne grille de la réserve, puis la réserve se réalimente', async () => {
    const { generateur, reserve, compter, stockage } = preparer();
    reserve.reapprovisionner('jeu-a', 'moyen');
    await reserve.auRepos();
    const premiere = (await stockage.lister('reserve', prefixeReserve('jeu-a', 'moyen')))[0];
    const r = await reserve.obtenirGrille('jeu-a', 'moyen').resultat;
    assert.ok(r.statut === 'ok');
    assert.equal(r.origine, 'reserve');
    assert.deepEqual(r.puzzle, premiere?.valeur.puzzle);
    await reserve.auRepos();
    assert.equal(await compter('jeu-a', 'moyen'), 3);
    const restantes = await stockage.lister('reserve', prefixeReserve('jeu-a', 'moyen'));
    assert.ok(restantes.every((e) => e.valeur.puzzle.graine !== r.puzzle.graine), 'grille servie retirée');
    assert.equal(generateur.demandes.at(-1)?.niveau, 'moyen');
  });

  test('une grille n\'est jamais servie deux fois, même pour des demandes simultanées', async () => {
    const { generateur, reserve } = preparer();
    reserve.reapprovisionner('jeu-a', 'expert');
    await reserve.auRepos();
    generateur.politique = () => null; // plus de réalimentation pendant le test
    const resultats = await Promise.all(Array.from({ length: 6 }, () => reserve.obtenirGrille('jeu-a', 'expert').resultat));
    const origines = resultats.map((r) => (r.statut === 'ok' ? r.origine : r.statut));
    assert.deepEqual(origines.filter((o) => o === 'reserve').length, 3);
    assert.deepEqual(origines.filter((o) => o === 'pack').length, 3);
    const graines = resultats.map((r) => (r.statut === 'ok' ? r.puzzle.graine : -1));
    assert.equal(new Set(graines).size, 6);
    reserve.arreter();
  });

  test('réserve vide : bascule sur le pack, sans génération urgente', async () => {
    const { generateur, reserve } = preparer();
    generateur.politique = () => null; // la génération de fond ne finit jamais
    const r = await reserve.obtenirGrille('jeu-a', 'diabolique').resultat;
    assert.ok(r.statut === 'ok');
    assert.equal(r.origine, 'pack');
    assert.equal(r.puzzle.notation.niveau, 'diabolique');
    assert.ok(generateur.demandes.every((d) => d.priorite === 'fond'));
    reserve.arreter();
  });

  test('ni réserve ni pack : génération urgente relancée immédiatement jusqu\'à réussir', async () => {
    const { horloge, generateur, reserve } = preparer();
    let urgentes = 0;
    generateur.politique = politique((_j, _n, priorite) => {
      if (priorite === 'fond') return null;
      urgentes++;
      return urgentes <= 4 ? { statut: 'echec', raison: 'budget épuisé' } : 'ok';
    });
    const r = await reserve.obtenirGrille('jeu-a', 'moyen').resultat;
    assert.ok(r.statut === 'ok');
    assert.equal(r.origine, 'generee');
    assert.equal(urgentes, 5);
    assert.equal(horloge.enAttente, 0, 'aucun délai programmé pour une génération urgente');
    reserve.arreter();
  });

  test('la génération urgente interrompt la réalimentation, qui reprend ensuite', async () => {
    const { generateur, reserve } = preparer();
    generateur.politique = politique((_j, _n, priorite) => (priorite === 'fond' ? null : 'ok'));
    reserve.reapprovisionner('jeu-a', 'facile');
    await laisserFiler();
    const fond = generateur.enAttente()[0];
    assert.equal(fond?.priorite, 'fond');
    const r = await reserve.obtenirGrille('jeu-a', 'moyen').resultat;
    assert.ok(r.statut === 'ok' && r.origine === 'generee');
    assert.equal(fond?.annulee, true, 'demande de fond annulée pour libérer le worker');
    await laisserFiler();
    const reprise = generateur.enAttente();
    assert.equal(reprise.length, 1);
    assert.deepEqual([reprise[0]?.niveau, reprise[0]?.priorite], ['moyen', 'fond'], 'reprise par le niveau joué');
    reserve.arreter();
  });

  test('génération urgente annulée par le joueur', async () => {
    const { generateur, reserve } = preparer();
    generateur.politique = () => null;
    const demande = reserve.obtenirGrille('jeu-a', 'moyen');
    await laisserFiler();
    const urgente = generateur.enAttente().find((d) => d.priorite === 'urgent');
    assert.ok(urgente !== undefined);
    demande.annuler();
    assert.deepEqual(await demande.resultat, { statut: 'annule' });
    assert.equal(urgente.annulee, true);
    reserve.arreter();
  });

  test('génération urgente : abandon après 3 erreurs techniques d\'affilée', async () => {
    const { generateur, reserve } = preparer();
    generateur.politique = politique((_j, _n, priorite) =>
      priorite === 'fond' ? null : { statut: 'erreur', message: 'jeu introuvable' },
    );
    const r = await reserve.obtenirGrille('jeu-a', 'moyen').resultat;
    assert.equal(r.statut, 'erreur');
    assert.equal(generateur.demandes.filter((d) => d.priorite === 'urgent').length, 3);
    reserve.arreter();
  });

  test('annulation juste après la prise dans la réserve : la grille y est remise', async () => {
    const { generateur, reserve, stockage } = preparer();
    reserve.reapprovisionner('jeu-a', 'moyen');
    await reserve.auRepos();
    generateur.politique = () => null;
    const avant = await stockage.lister('reserve', prefixeReserve('jeu-a', 'moyen'));
    const demande = reserve.obtenirGrille('jeu-a', 'moyen');
    demande.annuler();
    assert.deepEqual(await demande.resultat, { statut: 'annule' });
    assert.deepEqual(await stockage.lister('reserve', prefixeReserve('jeu-a', 'moyen')), avant);
    reserve.arreter();
  });

  test('échec de réalimentation : nouvel essai après 30 s, puis 2 min, puis 10 min ; les autres niveaux continuent', async () => {
    const { horloge, generateur, reserve, compter } = preparer();
    let expertReussit = false;
    generateur.politique = politique((jeu, niveau) =>
      jeu === 'jeu-a' && niveau === 'expert' && !expertReussit ? { statut: 'echec', raison: 'budget épuisé' } : 'ok',
    );
    const essaisExpert = (): number => generateur.demandes.filter((d) => d.niveau === 'expert').length;
    const avancer = async (ms: number): Promise<void> => {
      horloge.avancer(ms);
      await laisserFiler();
      await reserve.auRepos();
    };

    reserve.reapprovisionner('jeu-a', 'expert');
    await reserve.auRepos();
    assert.equal(essaisExpert(), 1);
    assert.equal(await compter('jeu-a', 'expert'), 0);
    assert.equal(await compter('jeu-a', 'diabolique'), 3, 'les autres niveaux sont réalimentés');
    assert.equal(await compter('jeu-b', 'moyen'), 3);

    await avancer(29_999);
    assert.equal(essaisExpert(), 1, 'pas de nouvel essai avant 30 s');
    await avancer(1);
    assert.equal(essaisExpert(), 2);
    await avancer(119_999);
    assert.equal(essaisExpert(), 2, 'pas de nouvel essai avant 2 min');
    await avancer(1);
    assert.equal(essaisExpert(), 3);
    await avancer(599_999);
    assert.equal(essaisExpert(), 3, 'pas de nouvel essai avant 10 min');
    expertReussit = true;
    await avancer(1);
    assert.equal(await compter('jeu-a', 'expert'), 3);
    assert.equal(essaisExpert(), 6);
  });

  test('arreter : génération de fond annulée, plus aucune réalimentation', async () => {
    const { generateur, reserve } = preparer();
    generateur.politique = () => null;
    reserve.reapprovisionner('jeu-a', 'moyen');
    await laisserFiler();
    const fond = generateur.enAttente()[0];
    reserve.arreter();
    assert.equal(fond?.annulee, true);
    reserve.reapprovisionner('jeu-a', 'facile');
    await laisserFiler();
    assert.equal(generateur.demandes.length, 1);
  });
});
