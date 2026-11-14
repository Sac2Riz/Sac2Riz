// MISES À JOUR DE L'APPLI (côté page) : enregistre le service worker et signale une nouvelle
// version quand elle est prête, SANS JAMAIS RECHARGER D'ELLE-MÊME.
//
// Une nouvelle version est « en attente » quand son service worker est installé (fichiers en
// cache) alors qu'une version contrôle déjà la page. On la signale (bouton « Mettre à jour » à côté
// de Réglages, annonce-mise-a-jour.ts, puis fenêtre de confirmation) :
//  - au démarrage, si elle attendait déjà (registration.waiting), ou si elle est EN COURS
//    D'INSTALLATION (registration.installing) : le navigateur cherche la mise à jour tout seul à
//    l'ouverture, en parallèle du démarrage de l'appli, et peut l'avoir trouvée avant que ce code
//    écoute « updatefound » (cause d'un bandeau jamais affiché, diagnostiquée à l'étape 6a) ;
//  - plus tard, quand le navigateur la découvre (updatefound → état « installed »).
// Une recherche est demandée dès l'enregistrement, puis à chaque retour au premier plan (verifier(),
// au plus une fois par minute) : une appli Android est souvent reprise sans être relancée, et le
// navigateur ne cherche alors rien de lui-même.
// Si l'appli est fermée complètement pendant qu'une version attend, le navigateur l'installe tout
// seul : la fenêtre « Sac2Riz a été mis à jour » le dit au lancement suivant (apres-mise-a-jour.ts).
// Appliquer (clic du joueur) : sauvegarde, message « activer » au service worker en attente, puis
// rechargement quand il a pris la main (controllerchange). Le tout premier contrôle de la page
// (première installation) déclenche aussi controllerchange : sans clic, il ne recharge rien.
//
// Les objets du navigateur sont décrits par de petites interfaces (testées avec des faux sous Node).

import type { Journal } from '../environnement.ts';
import type { MessageVersServiceWorker } from '../../types/service-worker.ts';

export interface TravailleurSw extends EventTarget {
  readonly state: string;
  postMessage(message: MessageVersServiceWorker): void;
}

export interface EnregistrementSw extends EventTarget {
  readonly waiting: TravailleurSw | null;
  readonly installing: TravailleurSw | null;
  update(): Promise<unknown>;
}

export interface ConteneurSw extends EventTarget {
  readonly controller: object | null;
  register(url: string, options: { readonly type: 'module' }): Promise<EnregistrementSw>;
}

export type OptionsMiseAJour = {
  readonly conteneur: ConteneurSw;
  /** Adresse du service worker, relative à la page (« ./service-worker.js »). */
  readonly url: string;
  /** Montre au joueur qu'une version est prête ; appliquer() lance la mise à jour. Une fois par version. */
  readonly signaler: (appliquer: () => Promise<void>) => void;
  /** Juste avant de passer à la nouvelle version (sauvegarde de la partie en cours). */
  readonly avantRechargement: () => Promise<void>;
  readonly recharger: () => void;
  /** Horloge en millisecondes (Date.now). */
  readonly maintenant: () => number;
  readonly journal: Journal;
};

export type SuiviMiseAJour = {
  /** Demande au navigateur de chercher une nouvelle version (au plus une fois par heure). */
  readonly verifier: () => void;
};

/** Écart minimal entre deux recherches demandées au retour au premier plan (un petit fichier à relire). */
export const INTERVALLE_VERIFICATION_MS = 60 * 1000;

/** Enregistre le service worker et suit ses mises à jour ; null si l'enregistrement échoue. */
export async function suivreMisesAJour(o: OptionsMiseAJour): Promise<SuiviMiseAJour | null> {
  let enregistrement: EnregistrementSw;
  try {
    // type « module » : le service worker importe des modules ES (comme le reste de l'appli)
    enregistrement = await o.conteneur.register(o.url, { type: 'module' });
  } catch (erreur) {
    o.journal(`Service worker non enregistré (${String(erreur)}) : pas de fonctionnement hors ligne.`);
    return null;
  }

  let demandee = false;
  o.conteneur.addEventListener('controllerchange', () => {
    if (demandee) o.recharger();
  });

  const signales = new Set<TravailleurSw>();
  function proposer(travailleur: TravailleurSw): void {
    if (signales.has(travailleur)) return;
    signales.add(travailleur);
    o.signaler(async () => {
      if (demandee) return;
      await o.avantRechargement();
      demandee = true;
      travailleur.postMessage({ type: 'activer' });
    });
  }

  /** Version en cours d'installation : proposée dès qu'elle est installée (sauf toute première installation). */
  function suivre(travailleur: TravailleurSw): void {
    const verifierEtat = (): void => {
      // Sans contrôleur, c'est la toute première installation : rien à proposer
      if (travailleur.state === 'installed' && o.conteneur.controller !== null) proposer(travailleur);
    };
    travailleur.addEventListener('statechange', verifierEtat);
    verifierEtat();
  }

  // Déjà en attente au démarrage (installée pendant une session précédente, ou pendant le démarrage)
  if (enregistrement.waiting !== null && o.conteneur.controller !== null) proposer(enregistrement.waiting);
  // Déjà en cours d'installation : le navigateur l'a trouvée avant que l'on écoute « updatefound »
  if (enregistrement.installing !== null) suivre(enregistrement.installing);

  enregistrement.addEventListener('updatefound', () => {
    if (enregistrement.installing !== null) suivre(enregistrement.installing);
  });

  const chercher = (): void => {
    enregistrement.update().catch((erreur: unknown) => o.journal(`Recherche de mise à jour impossible : ${String(erreur)}`));
  };
  // Recherche tout de suite, sans attendre celle du navigateur
  let derniere = o.maintenant();
  chercher();
  return {
    verifier: () => {
      const instant = o.maintenant();
      if (instant - derniere < INTERVALLE_VERIFICATION_MS) return;
      derniere = instant;
      chercher();
    },
  };
}
