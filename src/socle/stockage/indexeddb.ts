// Stockage IndexedDB (navigateur). Même comportement que memoire.ts, vérifié par les mêmes
// tests côté Node pour la version en mémoire ; cette version-ci se teste dans le navigateur.
//
// IndexedDB fonctionne par « requêtes » qui préviennent de leur fin par des événements ;
// les petites fonctions attendre() et finTransaction() les transforment en promesses.
// Chaque opération a sa propre transaction : IndexedDB garantit qu'une transaction en
// lecture-écriture n'est jamais entrelacée avec une autre sur le même magasin, même depuis un
// autre onglet. C'est ce qui rend prendrePremier atomique.

import { journalConsole, type Journal } from '../environnement.ts';
import { demanderStockagePersistant, type GestionnaireStockage } from './persistance.ts';
import { migrer, VERSION_SCHEMA } from './schema.ts';
import type { DonneesExportees } from '../../types/sauvegarde.ts';
import {
  ecrituresDonnees,
  GARDES,
  MAGASINS_EXPORTES,
  type ContenuMagasins,
  type Entree,
  type NomMagasin,
  type Stockage,
} from './stockage.ts';

export const NOM_BASE = 'sac2riz';

export type OptionsIndexedDB = {
  readonly nom: string;
  readonly fabrique: IDBFactory;
  /** navigator.storage, ou null s'il n'existe pas. */
  readonly gestionnaire: GestionnaireStockage | null;
  readonly journal: Journal;
};

function optionsParDefaut(): OptionsIndexedDB {
  // navigator.storage peut manquer (vieux navigateurs, contexte non sécurisé)
  const gestionnaire: GestionnaireStockage | null = 'storage' in navigator ? navigator.storage : null;
  return { nom: NOM_BASE, fabrique: indexedDB, gestionnaire, journal: journalConsole };
}

function attendre<T>(requete: IDBRequest<T>): Promise<T> {
  return new Promise((resoudre, rejeter) => {
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error ?? new Error('Erreur IndexedDB'));
  });
}

/** Attend que la transaction soit validée (écritures réellement enregistrées). */
function finTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resoudre, rejeter) => {
    transaction.oncomplete = () => resoudre();
    transaction.onerror = () => rejeter(transaction.error ?? new Error('Transaction IndexedDB en erreur'));
    transaction.onabort = () => rejeter(transaction.error ?? new Error('Transaction IndexedDB annulée'));
  });
}

/** Plage des clés texte qui commencent par le préfixe ('￿' : plus grand caractère courant). */
function plage(prefixe: string): IDBKeyRange {
  return IDBKeyRange.bound(prefixe, `${prefixe}￿`);
}

/** Ouvre (ou crée, ou met à jour) la base, puis demande le stockage persistant. */
export async function ouvrirStockageIndexedDB(options: Partial<OptionsIndexedDB> = {}): Promise<Stockage> {
  const { nom, fabrique, gestionnaire, journal } = { ...optionsParDefaut(), ...options };
  const { db, baseNeuve } = await ouvrirBase(fabrique, nom, journal);
  // Pas d'attente : l'appli n'a pas besoin du résultat pour fonctionner
  void demanderStockagePersistant(gestionnaire, journal);
  return creerStockage(db, baseNeuve);
}

/** Ouvre la base ; baseNeuve : elle n'existait pas avant (version précédente du schéma = 0). */
function ouvrirBase(fabrique: IDBFactory, nom: string, journal: Journal): Promise<{ db: IDBDatabase; baseNeuve: boolean }> {
  return new Promise((resoudre, rejeter) => {
    let baseNeuve = false;
    const requete = fabrique.open(nom, VERSION_SCHEMA);
    // Base neuve ou plus ancienne que le code : on applique les migrations manquantes
    requete.onupgradeneeded = (evenement) => {
      const db = requete.result;
      baseNeuve = evenement.oldVersion === 0;
      const atteinte = migrer(
        {
          creerMagasin: (magasin) => db.createObjectStore(magasin),
          supprimerMagasin: (magasin) => db.deleteObjectStore(magasin),
          magasins: () => Array.from(db.objectStoreNames),
        },
        evenement.oldVersion,
      );
      journal(`Stockage : schéma migré de la version ${evenement.oldVersion} à ${atteinte}.`);
    };
    requete.onblocked = () => journal('Stockage : mise à jour bloquée par un autre onglet ouvert.');
    requete.onsuccess = () => {
      const db = requete.result;
      // Un autre onglet (plus récent) veut mettre la base à jour : on la libère
      db.onversionchange = () => db.close();
      resoudre({ db, baseNeuve });
    };
    requete.onerror = () => {
      const erreur = requete.error;
      if (erreur?.name === 'VersionError') {
        rejeter(new Error('La base de données est plus récente que l\'appli : recharger la page.'));
      } else {
        rejeter(erreur ?? new Error('Ouverture d\'IndexedDB impossible'));
      }
    };
  });
}

function creerStockage(db: IDBDatabase, baseNeuve: boolean): Stockage {
  function magasin(nom: NomMagasin, mode: IDBTransactionMode): { store: IDBObjectStore; fin: Promise<void> } {
    const transaction = db.transaction(nom, mode);
    const fin = finTransaction(transaction);
    // Si une requête échoue, on ne lira jamais « fin » : évite une erreur « promesse rejetée non traitée »
    fin.catch(() => undefined);
    return { store: transaction.objectStore(nom), fin };
  }

  async function lister<M extends NomMagasin>(nom: M, prefixe: string): Promise<readonly Entree<M>[]> {
    const { store, fin } = magasin(nom, 'readonly');
    const [cles, valeurs] = await Promise.all([attendre(store.getAllKeys(plage(prefixe))), attendre(store.getAll(plage(prefixe)))]);
    await fin;
    const garde = GARDES[nom];
    const resultat: Entree<M>[] = [];
    valeurs.forEach((valeur: unknown, i) => {
      if (garde(valeur)) resultat.push({ cle: String(cles[i]), valeur });
    });
    return resultat;
  }

  return {
    baseNeuve,
    async lire<M extends NomMagasin>(nom: M, cle: string): Promise<ContenuMagasins[M] | null> {
      const { store, fin } = magasin(nom, 'readonly');
      const valeur: unknown = await attendre(store.get(cle));
      await fin;
      return GARDES[nom](valeur) ? valeur : null;
    },
    async ecrire<M extends NomMagasin>(nom: M, cle: string, valeur: ContenuMagasins[M]): Promise<void> {
      const { store, fin } = magasin(nom, 'readwrite');
      store.put(valeur, cle);
      await fin;
    },
    async supprimer(nom: NomMagasin, cle: string): Promise<void> {
      const { store, fin } = magasin(nom, 'readwrite');
      store.delete(cle);
      await fin;
    },
    lister,
    async compter(nom: NomMagasin, prefixe: string): Promise<number> {
      return (await lister(nom, prefixe)).length;
    },
    async prendrePremier<M extends NomMagasin>(nom: M, prefixe: string): Promise<Entree<M> | null> {
      const { store, fin } = magasin(nom, 'readwrite');
      const garde = GARDES[nom];
      const trouvee: { entree: Entree<M> | null } = { entree: null };
      const requete = store.openCursor(plage(prefixe));
      // Parcours dans l'ordre des clés, dans UNE transaction : lecture + suppression atomiques
      requete.onsuccess = () => {
        const curseur = requete.result;
        if (curseur === null) return;
        const valeur: unknown = curseur.value;
        curseur.delete();
        if (garde(valeur)) {
          trouvee.entree = { cle: String(curseur.key), valeur };
        } else {
          curseur.continue(); // entrée invalide supprimée : on passe à la suivante
        }
      };
      await fin;
      return trouvee.entree;
    },
    async remplacerDonnees(donnees: DonneesExportees): Promise<void> {
      // UNE transaction sur les quatre magasins : IndexedDB annule tout si une écriture échoue
      const transaction = db.transaction([...MAGASINS_EXPORTES], 'readwrite');
      const fin = finTransaction(transaction);
      for (const nom of MAGASINS_EXPORTES) transaction.objectStore(nom).clear();
      for (const { magasin: nom, cle, valeur } of ecrituresDonnees(donnees)) {
        transaction.objectStore(nom).put(valeur, cle);
      }
      await fin;
    },
    fermer(): void {
      db.close();
    },
  };
}
