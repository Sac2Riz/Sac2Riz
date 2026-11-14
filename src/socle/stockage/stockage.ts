// INTERFACE DU STOCKAGE : ce que les services peuvent lire et écrire, sans savoir où.
// Deux implémentations : IndexedDB dans le navigateur (indexeddb.ts) et en mémoire pour les
// tests (memoire.ts ; IndexedDB n'existe pas dans Node). Les deux passent les mêmes tests.
//
// Les données sont rangées dans des « magasins » (object stores d'IndexedDB), chacun avec un
// type de contenu. Les clés sont du texte ; « lister » et « prendrePremier » travaillent sur
// les clés qui commencent par un préfixe, dans l'ordre croissant des clés.

import { estNouveautesVues, type NouveautesVues } from '../../types/nouveautes.ts';
import type { Niveau } from '../../types/niveaux.ts';
import type {
  DonneesExportees,
  EntreeReserve,
  EtatPack,
  PartieSauvegardee,
  ReglagesEnregistres,
  StatsJeu,
} from '../../types/sauvegarde.ts';
import {
  estEntreeReserve,
  estEtatPack,
  estPartieSauvegardee,
  estReglagesEnregistres,
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
  /** Réglages (une seule clé : CLE_REGLAGES). Une ancienne forme est complétée à la lecture (socle/reglages.ts). */
  readonly reglages: ReglagesEnregistres;
  /**
   * Informations propres à l'appli (schéma n° 2) : nouveautés déjà vues (clé CLE_NOUVEAUTES_VUES).
   * Ni exportées ni remplacées par un import : ce ne sont pas des données de jeu.
   */
  readonly appli: NouveautesVues;
};

export type NomMagasin = keyof ContenuMagasins;

/** Liste des magasins du schéma actuel (doit correspondre au résultat des migrations). */
export const NOMS_MAGASINS: readonly NomMagasin[] = ['parties', 'reserve', 'packsJoues', 'stats', 'reglages', 'appli'];

export const CLE_REGLAGES = 'reglages';
export const CLE_NOUVEAUTES_VUES = 'nouveautes-vues';

/** Garde de type de chaque magasin : une donnée relue qui ne la passe pas est ignorée. */
export const GARDES: { readonly [M in NomMagasin]: (valeur: unknown) => valeur is ContenuMagasins[M] } = {
  parties: estPartieSauvegardee,
  reserve: estEntreeReserve,
  packsJoues: estEtatPack,
  stats: estStatsJeu,
  reglages: estReglagesEnregistres,
  appli: estNouveautesVues,
};

/** Clé d'un couple jeu/niveau (magasin packsJoues). Les ids de jeu sont en kebab-case : pas de « / ». */
export function cleJeuNiveau(jeu: string, niveau: Niveau): string {
  return `${jeu}/${niveau}`;
}

/** Préfixe des clés de la réserve pour un couple jeu/niveau (le « / » final évite « jeu/moyen » ≈ « jeu/moyen2 »). */
export function prefixeReserve(jeu: string, niveau: Niveau): string {
  return `${cleJeuNiveau(jeu, niveau)}/`;
}

/** Magasins remplacés par remplacerDonnees (tous sauf la réserve). */
export const MAGASINS_EXPORTES = ['parties', 'stats', 'reglages', 'packsJoues'] as const;

type EcritureMagasin = { readonly [M in NomMagasin]: { readonly magasin: M; readonly cle: string; readonly valeur: ContenuMagasins[M] } }[NomMagasin];

/** Écritures (magasin, clé, valeur) qui rangent ces données dans les magasins. */
export function ecrituresDonnees(donnees: DonneesExportees): readonly EcritureMagasin[] {
  return [
    { magasin: 'reglages', cle: CLE_REGLAGES, valeur: donnees.reglages },
    ...donnees.parties.map((p): EcritureMagasin => ({ magasin: 'parties', cle: p.jeu, valeur: p })),
    ...Object.entries(donnees.stats).map(([jeu, s]): EcritureMagasin => ({ magasin: 'stats', cle: jeu, valeur: s })),
    ...Object.entries(donnees.packsJoues).map(([cle, e]): EcritureMagasin => ({ magasin: 'packsJoues', cle, valeur: e })),
  ];
}

export type Entree<M extends NomMagasin> = { readonly cle: string; readonly valeur: ContenuMagasins[M] };

export interface Stockage {
  /**
   * Vrai si la base n'existait pas avant cette ouverture : tout premier lancement de l'appli sur
   * l'appareil (ou données effacées). Faux si une version précédente l'avait déjà créée.
   */
  readonly baseNeuve: boolean;
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
  /**
   * Remplace TOUT le contenu des magasins parties, stats, reglages et packsJoues par ces données
   * (import d'une sauvegarde), EN UNE SEULE OPÉRATION ATOMIQUE : soit tout est remplacé, soit rien
   * (en cas d'erreur, les anciennes données restent intactes). La réserve n'est pas touchée.
   */
  remplacerDonnees(donnees: DonneesExportees): Promise<void>;
  /** Libère la base (le stockage n'est plus utilisable ensuite). */
  fermer(): void;
}
