// INTERFACE DU STOCKAGE : ce que les services peuvent lire et écrire, sans savoir où.
// Deux implémentations : IndexedDB dans le navigateur (indexeddb.ts) et en mémoire pour les
// tests (memoire.ts ; IndexedDB n'existe pas dans Node). Les deux passent les mêmes tests.
//
// Les données sont rangées dans des « magasins » (object stores d'IndexedDB), chacun avec un
// type de contenu. Les clés sont du texte ; « lister » et « prendrePremier » travaillent sur
// les clés qui commencent par un préfixe, dans l'ordre croissant des clés.

import type { Niveau } from '../../types/niveaux.ts';
import type {
  EntreeReserve,
  EtatPack,
  PartieSauvegardee,
  Reglages,
  StatsJeu,
} from '../../types/sauvegarde.ts';
import {
  estEntreeReserve,
  estEtatPack,
  estPartieSauvegardee,
  estReglages,
  estStatsJeu,
} from '../../utils/gardes-sauvegarde.ts';

/** Contenu de chaque magasin. */
export type ContenuMagasins = {
  /** Partie en cours, une par jeu (clé = id du jeu). */
  readonly parties: PartieSauvegardee;
  /** Grilles d'avance (clé = « <jeu>/<niveau>/<horodatage>-<compteur> »). */
  readonly reserve: EntreeReserve;
  /** Avancement dans les packs (clé = « <jeu>/<niveau> »). */
  readonly packsJoues: EtatPack;
  /** Statistiques (clé = id du jeu). */
  readonly stats: StatsJeu;
  /** Réglages (une seule clé : CLE_REGLAGES). */
  readonly reglages: Reglages;
};

export type NomMagasin = keyof ContenuMagasins;

/** Liste des magasins du schéma actuel (doit correspondre au résultat des migrations). */
export const NOMS_MAGASINS: readonly NomMagasin[] = ['parties', 'reserve', 'packsJoues', 'stats', 'reglages'];

export const CLE_REGLAGES = 'reglages';

/** Garde de type de chaque magasin : une donnée relue qui ne la passe pas est ignorée. */
export const GARDES: { readonly [M in NomMagasin]: (valeur: unknown) => valeur is ContenuMagasins[M] } = {
  parties: estPartieSauvegardee,
  reserve: estEntreeReserve,
  packsJoues: estEtatPack,
  stats: estStatsJeu,
  reglages: estReglages,
};

/** Clé d'un couple jeu/niveau (magasin packsJoues). Les ids de jeu sont en kebab-case : pas de « / ». */
export function cleJeuNiveau(jeu: string, niveau: Niveau): string {
  return `${jeu}/${niveau}`;
}

/** Préfixe des clés de la réserve pour un couple jeu/niveau (le « / » final évite « jeu/moyen » ≈ « jeu/moyen2 »). */
export function prefixeReserve(jeu: string, niveau: Niveau): string {
  return `${cleJeuNiveau(jeu, niveau)}/`;
}

export type Entree<M extends NomMagasin> = { readonly cle: string; readonly valeur: ContenuMagasins[M] };

export interface Stockage {
  /** Valeur de la clé, ou null si elle est absente ou invalide. */
  lire<M extends NomMagasin>(magasin: M, cle: string): Promise<ContenuMagasins[M] | null>;
  /** Crée ou remplace la valeur de la clé. */
  ecrire<M extends NomMagasin>(magasin: M, cle: string, valeur: ContenuMagasins[M]): Promise<void>;
  supprimer(magasin: NomMagasin, cle: string): Promise<void>;
  /** Entrées valides dont la clé commence par le préfixe, par clé croissante. */
  lister<M extends NomMagasin>(magasin: M, prefixe: string): Promise<readonly Entree<M>[]>;
  /** Nombre d'entrées valides dont la clé commence par le préfixe. */
  compter(magasin: NomMagasin, prefixe: string): Promise<number>;
  /**
   * Retire et renvoie la première entrée valide (plus petite clé) qui commence par le préfixe,
   * EN UNE SEULE OPÉRATION ATOMIQUE : deux appels simultanés n'obtiennent jamais la même entrée.
   * Les entrées invalides rencontrées en chemin sont supprimées. null si rien ne correspond.
   */
  prendrePremier<M extends NomMagasin>(magasin: M, prefixe: string): Promise<Entree<M> | null>;
  /** Libère la base (le stockage n'est plus utilisable ensuite). */
  fermer(): void;
}
