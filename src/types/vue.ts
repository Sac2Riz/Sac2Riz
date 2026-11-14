// LE CONTRAT des modules de jeu — partie AFFICHAGE (utilise le DOM).
// Ce fichier ne doit jamais être importé par du code pur (moteur, logique, worker).

import type { LogiqueJeu, MarquesIndice, MetaJeu, Puzzle } from './jeu.ts';
import type { Json } from './json.ts';
import type { Niveau } from './niveaux.ts';
import type { Reglages } from './sauvegarde.ts';

/** Ce que le socle fournit à la vue d'un jeu. */
export interface ContexteVue<A extends Json> {
  /** Joue une action : le socle gère historique, chrono, sauvegarde et fin de partie. */
  jouer(action: A): void;
  /** Réglages actuels (ils peuvent changer pendant la partie : les relire à chaque affichage). */
  reglages(): Readonly<Reglages>;
  /** Vrai si le mode notes est actif. */
  modeNotes(): boolean;
}

/** Ce que la vue doit dessiner. */
export type AffichageVue<D extends Json, E extends Json> = {
  readonly etat: E;
  readonly donnees: D;
  /** Cases fausses à signaler (vide si la vérification des erreurs est désactivée). */
  readonly erreurs: readonly number[];
  /** Indice affiché (1er temps : cases et candidats à mettre en évidence), ou null. */
  readonly indice: MarquesIndice | null;
};

/** Vue montée dans la page pour une partie. */
export interface InstanceVue<D extends Json, E extends Json> {
  /** Redessine la grille (après chaque action, annulation, rétablissement, changement de réglage). */
  afficher(affichage: AffichageVue<D, E>): void;
  /** Valeur saisie via le pavé commun ou le clavier (le jeu sait quelle case est sélectionnée). */
  saisir(valeur: string): void;
  /** Bouton « effacer » du socle. */
  effacer(): void;
  /** Retire la vue de la page et libère ses écouteurs. */
  detruire(): void;
}

/** Pavé de saisie : celui du socle avec les valeurs voulues, ou un panneau propre au jeu. */
export type ConfigPave =
  | { readonly type: 'commun'; readonly valeurs: readonly string[] }
  | { readonly type: 'personnalise' };

/** Outils du socle qu'un jeu peut masquer (ex. « notes » pour un jeu sans notes). */
export const OUTILS_MASQUABLES = ['notes', 'effacer', 'indice'] as const;
export type OutilMasquable = (typeof OUTILS_MASQUABLES)[number];

/**
 * Zones de l'écran confiées à la vue : la grille, et la zone du pavé quand la vue a choisi
 * { type: 'personnalise' } (null avec le pavé commun, que le socle dessine lui-même).
 * Les deux sont dimensionnées par le socle (container-type: size pour la grille ; la zone du
 * pavé défile si son contenu dépasse).
 */
export type ZonesVue = {
  readonly grille: HTMLElement;
  readonly pave: HTMLElement | null;
};

export interface VueJeu<D extends Json, E extends Json, A extends Json> {
  readonly pave: ConfigPave;
  /** Outils du socle à masquer pour ce jeu ([] = tous affichés). */
  readonly outilsMasques: readonly OutilMasquable[];
  /**
   * Pavé commun : nombre de fois où chaque valeur peut encore être placée, ou null. Seul le zéro
   * compte pour le socle : la touche est alors estompée (aucun nombre n'est affiché).
   */
  restants(etat: E, donnees: D): Readonly<Record<string, number>> | null;
  /** Crée l'affichage du jeu dans les zones fournies par le socle. */
  monter(zones: ZonesVue, contexte: ContexteVue<A>): InstanceVue<D, E>;
}

/**
 * Point d'entrée d'un jeu (fichier index.ts : « export const jeu = … »).
 * Logique et vue sont chargées à la demande (import dynamique) : l'accueil
 * ne télécharge que les métadonnées.
 */
export interface ModuleJeu<D extends Json, E extends Json, A extends Json> {
  readonly meta: MetaJeu;
  chargerLogique(): Promise<LogiqueJeu<D, E, A>>;
  chargerVue(): Promise<VueJeu<D, E, A>>;
  /**
   * Grilles pré-générées du jeu pour ce niveau (packs embarqués, voir socle/packs.ts),
   * ou null si le jeu n'a pas de pack pour ce niveau.
   */
  chargerPack(niveau: Niveau): Promise<readonly Puzzle<D>[] | null>;
}

/** Un jeu quelconque, tel que le socle le manipule. */
export type ModuleJeuQuelconque = ModuleJeu<Json, Json, Json>;

/** Une ligne du registre (src/games/registre.ts). */
export type EntreeRegistre = {
  /** Identique au nom du dossier et à meta.id. */
  readonly id: string;
  charger(): Promise<{ readonly jeu: ModuleJeuQuelconque }>;
};
