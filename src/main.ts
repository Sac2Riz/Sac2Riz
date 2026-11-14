// Point d'entrée de l'application (chargé par index.html) : ouvre le stockage, suit les mises à
// jour (service worker : hors ligne, nouvelle version proposée au joueur), applique le thème, crée les
// services (worker, packs, réserve, parties), affiche l'accueil, puis, si l'appli vient d'être mise à
// jour sans passer par le bouton, montre ses nouveautés (« Sac2Riz a été mis à jour »).

import { REGISTRE } from './games/registre.ts';
import { demarrerApp, type App } from './socle/app.ts';
import { creerClientNavigateur } from './socle/calculs.ts';
import { creerActionsDonnees } from './socle/donnees/actions-donnees.ts';
import { journalConsole } from './socle/environnement.ts';
import { creerServicePacks } from './socle/packs.ts';
import { creerAnnonceMiseAJour } from './socle/pwa/annonce-mise-a-jour.ts';
import { decisionApresMiseAJour, marquerVues } from './socle/pwa/apres-mise-a-jour.ts';
import { afficherMiseAJourFaite } from './socle/pwa/fenetre-mise-a-jour.ts';
import { lecteurCachesNavigateur, lireInfosMiseAJour } from './socle/pwa/infos-mise-a-jour.ts';
import { suivreMisesAJour } from './socle/pwa/mise-a-jour.ts';
import { lireVersion, texteVersion } from './socle/pwa/version.ts';
import { normaliserReglages } from './socle/reglages.ts';
import { creerServiceReserve } from './socle/reserve.ts';
import { creerServiceParties } from './socle/service-parties.ts';
import { ouvrirStockageIndexedDB } from './socle/stockage/indexeddb.ts';
import { creerStockageMemoire } from './socle/stockage/memoire.ts';
import { CLE_NOUVEAUTES_VUES, CLE_REGLAGES, type Stockage } from './socle/stockage/stockage.ts';
import { appliquerTheme } from './socle/theme.ts';
import { appliquerDirectionEnregistree } from './socle/design/appliquer.ts';
import { demarrerDecors } from './socle/design/decors.ts';
import { surveillerVisibilite } from './socle/visibilite.ts';
import { estFichierNouveautes, FICHIER_NOUVEAUTES, type FichierNouveautes, type GroupeNouveautes } from './types/nouveautes.ts';
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

/** Fichier JSON de la version installée (servi par le cache hors ligne) ; null s'il manque (npm run dev). */
async function chargerJson(url: URL): Promise<unknown> {
  const reponse = await fetch(url, { cache: 'no-cache' });
  if (!reponse.ok) return null;
  const valeur: unknown = await reponse.json();
  return valeur;
}

async function lireNouveautesInstallees(): Promise<FichierNouveautes | null> {
  const valeur = await chargerJson(new URL(`./${FICHIER_NOUVEAUTES}`, document.baseURI)).catch(() => null);
  return estFichierNouveautes(valeur) ? valeur : null;
}

async function demarrer(): Promise<void> {
  const racine = document.getElementById('app');
  if (racine === null) throw new Error('Élément #app introuvable dans index.html');
  // Étape 6b (temporaire) : direction de design à l'essai (lecture synchrone : dès le premier
  // affichage), et ses décors animés éventuels
  appliquerDirectionEnregistree();
  demarrerDecors(racine);

  const stockage = await ouvrirStockage();
  const versionActuelle = lireVersion(chargerJson, document.baseURI);

  /** Ajoute des nouveautés à celles déjà vues (bouton « Mettre à jour » confirmé, ou fenêtre après mise à jour). */
  async function noterVues(groupes: readonly GroupeNouveautes[]): Promise<void> {
    const vues = await stockage.lire('appli', CLE_NOUVEAUTES_VUES);
    await stockage.ecrire('appli', CLE_NOUVEAUTES_VUES, marquerVues(vues, groupes));
  }

  // Bouton « Mettre à jour » (à côté de Réglages), visible seulement quand une version est prête ;
  // sa fenêtre lit la nouvelle version dans son cache (déjà téléchargée : marche hors ligne)
  const annonce = creerAnnonceMiseAJour(
    async () =>
      lireInfosMiseAJour({
        caches: lecteurCachesNavigateur(caches),
        base: document.baseURI,
        actuelle: await versionActuelle,
        nouveautesActuelles: await lireNouveautesInstallees(),
      }),
    noterVues,
  );

  // Hors ligne et mises à jour, suivis le plus tôt possible : le navigateur cherche une nouvelle
  // version dès l'ouverture, en parallèle du démarrage. L'appli ne se recharge JAMAIS d'elle-même.
  let app: App | null = null;
  if ('serviceWorker' in navigator) {
    void suivreMisesAJour({
      conteneur: navigator.serviceWorker,
      url: './service-worker.js',
      signaler: annonce.proposer,
      // Sauvegarde de la partie en cours avant de passer à la nouvelle version
      avantRechargement: () => app?.sauvegarder() ?? Promise.resolve(),
      recharger: () => location.reload(),
      maintenant: Date.now,
      journal: journalConsole,
    }).then((suivi) => {
      if (suivi === null) return;
      surveillerVisibilite(document, (visible) => {
        if (visible) suivi.verifier();
      });
    });
  }

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

  app = demarrerApp({
    racine,
    jeux,
    parties: creerServiceParties(stockage),
    reserve,
    reglages,
    preparer: (puzzle, options) => clientPartie.preparer(puzzle, options),
    enregistrerReglages: (r) => stockage.ecrire('reglages', CLE_REGLAGES, r),
    // Redémarrage demandé par le joueur après un import (bouton « Redémarrer »)
    donnees: creerActionsDonnees({ stockage, jeux, redemarrer: () => location.reload() }),
    // version.json écrit par le build
    version: versionActuelle.then(texteVersion),
    boutonMiseAJour: annonce.bouton,
  });

  // Remplit la réserve en arrière-plan (dans le worker) pour des démarrages instantanés
  const premier = jeux[0];
  if (premier !== undefined) reserve.reapprovisionner(premier.meta.id, 'facile');

  // Mise à jour installée par le navigateur à la fermeture de l'appli : ses nouveautés, une seule fois
  const decision = decisionApresMiseAJour(
    await lireNouveautesInstallees(),
    await stockage.lire('appli', CLE_NOUVEAUTES_VUES),
    stockage.baseNeuve,
  );
  if (decision.enregistrer !== null) await stockage.ecrire('appli', CLE_NOUVEAUTES_VUES, decision.enregistrer);
  if (decision.montrer.length > 0) await afficherMiseAJourFaite(await versionActuelle, decision.montrer);
}

demarrer().catch((erreur: unknown) => {
  console.error('Erreur au démarrage :', erreur);
});
