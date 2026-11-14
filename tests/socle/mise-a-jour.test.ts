// Tests du suivi des mises à jour de l'appli (socle/pwa/mise-a-jour.ts) avec de faux objets
// « service worker » : nouvelle version signalée une fois, jamais de rechargement sans le clic
// du joueur, sauvegarde avant de passer à la nouvelle version, vérifications espacées.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  INTERVALLE_VERIFICATION_MS,
  suivreMisesAJour,
  type ConteneurSw,
  type EnregistrementSw,
  type OptionsMiseAJour,
  type TravailleurSw,
} from '../../src/socle/pwa/mise-a-jour.ts';
import type { MessageVersServiceWorker } from '../../src/types/service-worker.ts';

class FauxTravailleur extends EventTarget implements TravailleurSw {
  state = 'installing';
  readonly messages: MessageVersServiceWorker[] = [];
  postMessage(message: MessageVersServiceWorker): void {
    this.messages.push(message);
  }
  passerA(etat: string): void {
    this.state = etat;
    this.dispatchEvent(new Event('statechange'));
  }
}

class FauxEnregistrement extends EventTarget implements EnregistrementSw {
  waiting: FauxTravailleur | null = null;
  installing: FauxTravailleur | null = null;
  verifications = 0;
  async update(): Promise<void> {
    this.verifications++;
  }
  /** Le navigateur découvre une nouvelle version et commence à l'installer. */
  decouvrir(): FauxTravailleur {
    const t = new FauxTravailleur();
    this.installing = t;
    this.dispatchEvent(new Event('updatefound'));
    return t;
  }
}

class FauxConteneur extends EventTarget implements ConteneurSw {
  controller: object | null = null;
  readonly enregistrement = new FauxEnregistrement();
  echec = false;
  urls: string[] = [];
  async register(url: string): Promise<EnregistrementSw> {
    if (this.echec) throw new Error('refusé');
    this.urls.push(url);
    return this.enregistrement;
  }
  prendreLaMain(): void {
    this.controller = {};
    this.dispatchEvent(new Event('controllerchange'));
  }
}

function preparer(conteneur = new FauxConteneur()) {
  const signalements: (() => Promise<void>)[] = [];
  const journal: string[] = [];
  const evenements: string[] = [];
  let heure = 0;
  const options: OptionsMiseAJour = {
    conteneur,
    url: './service-worker.js',
    signaler: (appliquer) => signalements.push(appliquer),
    avantRechargement: async () => {
      evenements.push('sauvegarde');
    },
    recharger: () => evenements.push('rechargement'),
    maintenant: () => heure,
    journal: (m) => journal.push(m),
  };
  return {
    conteneur,
    signalements,
    journal,
    evenements,
    options,
    avancer: (ms: number) => {
      heure += ms;
    },
  };
}

describe('mises à jour de l\'appli', () => {
  test('première installation : rien à signaler, aucun rechargement', async () => {
    const t = preparer();
    assert.notEqual(await suivreMisesAJour(t.options), null);
    assert.deepEqual(t.conteneur.urls, ['./service-worker.js']);
    const sw = t.conteneur.enregistrement.decouvrir();
    sw.passerA('installed'); // pas encore de contrôleur : première installation
    sw.passerA('activated');
    t.conteneur.prendreLaMain(); // clients.claim()
    assert.equal(t.signalements.length, 0);
    assert.deepEqual(t.evenements, []);
  });

  test('nouvelle version découverte : signalée une fois, sans rechargement automatique', async () => {
    const t = preparer();
    t.conteneur.controller = {};
    await suivreMisesAJour(t.options);
    const sw = t.conteneur.enregistrement.decouvrir();
    assert.equal(t.signalements.length, 0); // pas encore installée
    sw.passerA('installed');
    sw.passerA('installed');
    assert.equal(t.signalements.length, 1);
    t.conteneur.prendreLaMain(); // un autre onglet l'a activée : pas de rechargement sans clic
    assert.deepEqual(t.evenements, []);
    assert.deepEqual(sw.messages, []);
  });

  test('version déjà en attente au démarrage : signalée', async () => {
    const conteneur = new FauxConteneur();
    conteneur.controller = {};
    conteneur.enregistrement.waiting = new FauxTravailleur();
    const t = preparer(conteneur);
    await suivreMisesAJour(t.options);
    assert.equal(t.signalements.length, 1);
  });

  test('clic sur Recharger : sauvegarde, puis activation, puis rechargement quand elle a pris la main', async () => {
    const t = preparer();
    t.conteneur.controller = {};
    await suivreMisesAJour(t.options);
    const sw = t.conteneur.enregistrement.decouvrir();
    sw.passerA('installed');
    const appliquer = t.signalements[0];
    assert.ok(appliquer !== undefined);
    await appliquer();
    assert.deepEqual(t.evenements, ['sauvegarde']);
    assert.deepEqual(sw.messages, [{ type: 'activer' }]);
    t.conteneur.prendreLaMain();
    assert.deepEqual(t.evenements, ['sauvegarde', 'rechargement']);
    await appliquer(); // second clic : sans effet
    assert.deepEqual(sw.messages, [{ type: 'activer' }]);
  });

  test('vérifications espacées d\'au moins une heure', async () => {
    const t = preparer();
    const suivi = await suivreMisesAJour(t.options);
    assert.ok(suivi !== null);
    suivi.verifier();
    assert.equal(t.conteneur.enregistrement.verifications, 0);
    t.avancer(INTERVALLE_VERIFICATION_MS);
    suivi.verifier();
    suivi.verifier();
    assert.equal(t.conteneur.enregistrement.verifications, 1);
  });

  test('enregistrement impossible : journalisé, l\'appli continue sans hors ligne', async () => {
    const conteneur = new FauxConteneur();
    conteneur.echec = true;
    const t = preparer(conteneur);
    assert.equal(await suivreMisesAJour(t.options), null);
    assert.equal(t.journal.length, 1);
  });
});
