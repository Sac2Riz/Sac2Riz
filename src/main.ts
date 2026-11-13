// Point d'entrée de l'application (chargé par index.html) : ouvre le stockage, applique le
// thème, crée les services (worker, packs, réserve, parties) puis affiche l'accueil.

import { REGISTRE } from './games/registre.ts';
import { demarrerApp } from './socle/app.ts';
import { creerClientNavigateur } from './socle/calculs.ts';
import { journalConsole } from './socle/environnement.ts';
import { creerServicePacks } from './socle/packs.ts';
import { creerServiceReserve } from './socle/reserve.ts';
import { creerServiceParties } from './socle/service-parties.ts';
import { ouvrirStockageIndexedDB } from './socle/stockage/indexeddb.ts';
import { creerStockageMemoire } from './socle/stockage/memoire.ts';
import { CLE_REGLAGES, type Stockage } from './socle/stockage/stockage.ts';
import { appliquerTheme } from './socle/theme.ts';
import { REGLAGES_PAR_DEFAUT } from './types/sauvegarde.ts';
import { creerAlea, graineAleatoire } from './utils/alea.ts';

/** IndexedDB, ou à défaut (navigation privée, stockage bloqué) un stockage en mémoire, perdu à la fermeture. */
async function ouvrirStockage(): Promise<Stockage> {
  try {
    return await ouvrirStockageIndexedDB();
  } catch (erreur) {
    journalConsole(`IndexedDB indisponible (${String(erreur)}) : les parties ne seront pas conservées.`);
    return creerStockageMemoire();
  }
}

async function demarrer(): Promise<void> {
  const racine = document.getElementById('app');
  if (racine === null) throw new Error('Élément #app introuvable dans index.html');

  const stockage = await ouvrirStockage();
  const reglages = (await stockage.lire('reglages', CLE_REGLAGES)) ?? REGLAGES_PAR_DEFAUT;
  appliquerTheme(reglages.theme);

  // Charge uniquement les points d'entrée (index.ts) des jeux : métadonnées pour l'accueil
  const jeux = await Promise.all(REGISTRE.map(async (entree) => (await entree.charger()).jeu));

  const client = creerClientNavigateur();
  const packs = creerServicePacks({
    stockage,
    alea: creerAlea(graineAleatoire()),
    charger: async (id, niveau) => (await jeux.find((j) => j.meta.id === id)?.chargerPack(niveau)) ?? null,
  });
  const reserve = creerServiceReserve({
    stockage,
    generateur: client,
    packs,
    jeux: jeux.map((j) => ({ id: j.meta.id, niveaux: j.meta.niveaux })),
  });

  demarrerApp({
    racine,
    jeux,
    parties: creerServiceParties(stockage),
    reserve,
    reglages,
    enregistrerReglages: (r) => stockage.ecrire('reglages', CLE_REGLAGES, r),
  });

  // Remplit la réserve en arrière-plan (dans le worker) pour des démarrages instantanés
  const premier = jeux[0];
  if (premier !== undefined) reserve.reapprovisionner(premier.meta.id, 'facile');
}

demarrer().catch((erreur: unknown) => {
  console.error('Erreur au démarrage :', erreur);
});
