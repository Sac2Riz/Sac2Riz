// Point d'entrée de l'application (chargé par index.html) : ouvre le stockage, applique le
// thème, crée les services (worker, packs, réserve, parties) puis affiche l'accueil ; enfin
// enregistre le service worker (hors ligne, mises à jour proposées au joueur).

import { REGISTRE } from './games/registre.ts';
import { demarrerApp } from './socle/app.ts';
import { creerClientNavigateur } from './socle/calculs.ts';
import { creerActionsDonnees } from './socle/donnees/actions-donnees.ts';
import { journalConsole } from './socle/environnement.ts';
import { creerServicePacks } from './socle/packs.ts';
import { afficherBandeauMiseAJour } from './socle/pwa/bandeau-mise-a-jour.ts';
import { suivreMisesAJour } from './socle/pwa/mise-a-jour.ts';
import { creerServiceReserve } from './socle/reserve.ts';
import { creerServiceParties } from './socle/service-parties.ts';
import { ouvrirStockageIndexedDB } from './socle/stockage/indexeddb.ts';
import { creerStockageMemoire } from './socle/stockage/memoire.ts';
import { CLE_REGLAGES, type Stockage } from './socle/stockage/stockage.ts';
import { normaliserReglages } from './socle/reglages.ts';
import { lireVersion, texteVersion } from './socle/pwa/version.ts';
import { appliquerTheme } from './socle/theme.ts';
import { surveillerVisibilite } from './socle/visibilite.ts';
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
  // Des réglages d'une ancienne version sont convertis (les choix du joueur sont conservés)
  const reglages = normaliserReglages(await stockage.lire('reglages', CLE_REGLAGES));
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
    jeux: jeux.map((j) => ({ id: j.meta.id, niveaux: j.meta.niveaux, generation: j.meta.generation })),
  });

  // Second worker, créé au premier besoin : la préparation d'une nouvelle partie (aide au départ)
  // n'attend jamais derrière une longue génération de fond du premier
  const clientPartie = creerClientNavigateur();

  const app = demarrerApp({
    racine,
    jeux,
    parties: creerServiceParties(stockage),
    reserve,
    reglages,
    preparer: (puzzle, options) => clientPartie.preparer(puzzle, options),
    enregistrerReglages: (r) => stockage.ecrire('reglages', CLE_REGLAGES, r),
    // Redémarrage demandé par le joueur après un import (bouton « Redémarrer »)
    donnees: creerActionsDonnees({ stockage, jeux, redemarrer: () => location.reload() }),
    // version.json écrit par le build (servi par le cache hors ligne) ; absent avec npm run dev
    version: lireVersion(async (url) => {
      const reponse = await fetch(url, { cache: 'no-cache' });
      if (!reponse.ok) return null;
      const valeur: unknown = await reponse.json();
      return valeur;
    }, document.baseURI).then(texteVersion),
  });

  // Remplit la réserve en arrière-plan (dans le worker) pour des démarrages instantanés
  const premier = jeux[0];
  if (premier !== undefined) reserve.reapprovisionner(premier.meta.id, 'facile');

  // Hors ligne et mises à jour : l'appli ne se recharge JAMAIS d'elle-même (voir socle/pwa/)
  if ('serviceWorker' in navigator) {
    const suivi = await suivreMisesAJour({
      conteneur: navigator.serviceWorker,
      url: './service-worker.js',
      signaler: afficherBandeauMiseAJour,
      avantRechargement: app.sauvegarder,
      recharger: () => location.reload(),
      maintenant: Date.now,
      journal: journalConsole,
    });
    if (suivi !== null) {
      surveillerVisibilite(document, (visible) => {
        if (visible) suivi.verifier();
      });
    }
  }
}

demarrer().catch((erreur: unknown) => {
  console.error('Erreur au démarrage :', erreur);
});
