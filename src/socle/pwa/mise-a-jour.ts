// MISES À JOUR DE L'APPLI (côté page) : enregistre le service worker et signale une nouvelle
// version quand elle est prête, SANS JAMAIS RECHARGER D'ELLE-MÊME.
//
// Une nouvelle version est « en attente » quand son service worker est installé (fichiers en
// cache) alors qu'une version contrôle déjà la page. On la signale (bandeau) :
//  - au démarrage, si elle attendait déjà (registration.waiting) ;
//  - plus tard, quand le navigateur la découvre (updatefound → état « installed »).
// Le navigateur vérifie les mises à jour à chaque ouverture ; verifier() le lui redemande quand
// l'appli revient au premier plan (au plus une fois par heure) : une appli restée ouverte des
// jours sur la tablette voit quand même la nouvelle version.
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

export const INTERVALLE_VERIFICATION_MS = 60 * 60 * 1000;

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

  // Déjà en attente au démarrage (installée pendant une session précédente)
  if (enregistrement.waiting !== null && o.conteneur.controller !== null) proposer(enregistrement.waiting);

  enregistrement.addEventListener('updatefound', () => {
    const travailleur = enregistrement.installing;
    if (travailleur === null) return;
    travailleur.addEventListener('statechange', () => {
      // Sans contrôleur, c'est la toute première installation : rien à proposer
      if (travailleur.state === 'installed' && o.conteneur.controller !== null) proposer(travailleur);
    });
  });

  let derniere = o.maintenant();
  return {
    verifier: () => {
      const instant = o.maintenant();
      if (instant - derniere < INTERVALLE_VERIFICATION_MS) return;
      derniere = instant;
      enregistrement.update().catch((erreur: unknown) => o.journal(`Recherche de mise à jour impossible : ${String(erreur)}`));
    },
  };
}
