// LE CONTRAT des modules de jeu — partie LOGIQUE (code pur : ni DOM, ni Node).
// Cette partie est utilisable dans la page, dans le Web Worker et dans les tests.
// La partie affichage (DOM) est dans types/vue.ts. Voir docs/ARCHITECTURE.md.
//
// Paramètres de type utilisés partout :
//   D = données de la grille (énoncé + solution), propres à chaque jeu ;
//   E = état de la saisie du joueur (chiffres posés, notes…) ;
//   A = action du joueur (poser, effacer, noter…).
// Tous les trois sont du JSON : sauvegarde et export sont donc automatiques.

import type { Alea } from './alea.ts';
import type { Json } from './json.ts';
import type { Niveau, Notation } from './niveaux.ts';

/** Description d'un jeu (affichée sur l'écran d'accueil). */
export type MetaJeu = {
  /** Identifiant unique en kebab-case, identique au nom du dossier dans src/games/. */
  readonly id: string;
  readonly nom: string;
  readonly description: string;
  /** Niveaux proposés par ce jeu (en général les 6). */
  readonly niveaux: readonly Niveau[];
  /** Version du format de D/E/A ; à incrémenter si ce format change (voir migrer). */
  readonly versionFormat: number;
};

/** Une grille à résoudre, entièrement sérialisable. */
export type Puzzle<D extends Json> = {
  readonly jeu: string;
  /** Graine qui a servi à la générer (reproductibilité). */
  readonly graine: number;
  readonly notation: Notation;
  readonly donnees: D;
};

export type OptionsGeneration = {
  /**
   * Budget de temps : generer() doit consulter cette fonction entre deux essais et abandonner
   * (résultat { ok: false }) dès qu'elle répond vrai. Le worker la construit à partir de
   * l'horloge ; le code du jeu reste pur (il ne lit jamais l'horloge lui-même).
   */
  readonly doitArreter: () => boolean;
};

/** Résultat de generer() ; le worker l'enveloppe ensuite dans un Puzzle (avec jeu et graine). */
export type ResultatGeneration<D extends Json> =
  | { readonly ok: true; readonly donnees: D; readonly notation: Notation }
  | { readonly ok: false; readonly raison: string };

/** Indice proposé au joueur. */
export type Indice<A extends Json> = {
  /** Action qui applique l'indice. */
  readonly action: A;
  /** Explication en français (ex. « Singleton caché dans la ligne 3 »). */
  readonly explication: string;
  /** Cases à mettre en évidence. */
  readonly cellules: readonly number[];
};

/**
 * Partie logique d'un jeu. Toutes les fonctions sont PURES : elles ne modifient
 * jamais leurs arguments et renvoient de nouvelles valeurs.
 * (Déclarées en syntaxe « méthode » : cela permet de ranger un LogiqueJeu<DonneesSudoku, …>
 * dans le registre sous la forme LogiqueJeu<Json, Json, Json>.)
 */
export interface LogiqueJeu<D extends Json, E extends Json, A extends Json> {
  readonly meta: MetaJeu;

  /** Génère une grille du niveau demandé (appelé dans le worker : peut être long). */
  generer(niveau: Niveau, alea: Alea, options: OptionsGeneration): ResultatGeneration<D>;

  /** Note la difficulté d'une grille ; null si elle exige de l'essai-erreur (grille rejetée). */
  noter(donnees: D): Notation | null;

  /** État de saisie au début d'une partie. */
  etatInitial(donnees: D): E;

  /** Applique une action et renvoie le NOUVEL état (l'ancien reste intact : annuler/rétablir). */
  appliquer(etat: E, action: A, donnees: D): E;

  /** Cases actuellement fausses (utilisé si la vérification des erreurs est activée). */
  erreurs(etat: E, donnees: D): readonly number[];

  /** Vrai quand la grille est entièrement et correctement remplie. */
  estTerminee(etat: E, donnees: D): boolean;

  /** Prochain coup conseillé, ou null s'il n'y en a pas. */
  indice(etat: E, donnees: D): Indice<A> | null;

  // Gardes de type : vérifient une valeur venant d'une sauvegarde ou d'un import
  // (on ne fait jamais confiance à un fichier) avant de l'utiliser comme D, E ou A.
  estDonnees(valeur: Json): valeur is D;
  estEtat(valeur: Json): valeur is E;
  estAction(valeur: Json): valeur is A;

  /** Facultatif : convertit des données d'une ancienne versionFormat vers l'actuelle. */
  migrer?(ancien: Json, versionOrigine: number): Json;
}

/** Forme imposée au fichier logique.ts de chaque jeu : « export const logique = … ». */
export type ModuleLogique = { readonly logique: LogiqueJeu<Json, Json, Json> };
