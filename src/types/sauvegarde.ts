// Types des données conservées : réglages, partie en cours, statistiques, export.
// Tout est du JSON (déclaré avec « type ») pour IndexedDB et le fichier d'export.

import type { Puzzle } from './jeu.ts';
import type { Json } from './json.ts';
import type { Niveau } from './niveaux.ts';

export type Theme = 'systeme' | 'clair' | 'sombre';

export type Reglages = {
  /** « systeme » suit le thème clair/sombre de la tablette. */
  readonly theme: Theme;
  /** Signale les chiffres faux (comparaison avec la solution). */
  readonly verifierErreurs: boolean;
  /** Met en évidence la ligne, la colonne, le bloc de la case choisie et les chiffres identiques. */
  readonly miseEnEvidence: boolean;
  /** Poser un chiffre retire cette note des cases de sa ligne, de sa colonne et de son bloc. */
  readonly retraitAutoNotes: boolean;
  /**
   * Chiffres casés : une NOUVELLE grille sans aucun nombre pré-placé en reçoit un (LogiqueJeu.preparer).
   * Sans effet sur une partie en cours.
   */
  readonly nombreAuDepart: boolean;
};

export const REGLAGES_PAR_DEFAUT: Reglages = {
  theme: 'systeme',
  verifierErreurs: false,
  miseEnEvidence: true,
  retraitAutoNotes: true,
  nombreAuDepart: false,
};

/** Réglages enregistrés par les étapes 3c à 4b (avant « nombre au départ »). */
export type ReglagesV2 = {
  readonly theme: Theme;
  readonly verifierErreurs: boolean;
  readonly miseEnEvidence: boolean;
  readonly retraitAutoNotes: boolean;
};

/** Réglages enregistrés avant l'étape 3c (seulement le thème et la vérification des erreurs). */
export type ReglagesV1 = {
  readonly theme: Theme;
  readonly verifierErreurs: boolean;
};

/** Ce que le magasin « reglages » peut contenir : forme actuelle ou ancienne (complétée à la lecture). */
export type ReglagesEnregistres = Reglages | ReglagesV2 | ReglagesV1;

/**
 * Partie en cours, sauvegardée automatiquement.
 * L'état n'est pas stocké : il est recalculé en rejouant les actions jusqu'au curseur
 * (ce qui donne aussi l'historique d'annulation/rétablissement illimité).
 */
export type PartieSauvegardee = {
  readonly jeu: string;
  /** versionFormat du jeu au moment de la sauvegarde. */
  readonly versionFormat: number;
  readonly puzzle: Puzzle<Json>;
  /** Toutes les actions jouées (y compris celles annulées, après le curseur). */
  readonly actions: readonly Json[];
  /** Nombre d'actions actuellement appliquées (les suivantes peuvent être rétablies). */
  readonly curseur: number;
  readonly chronoMs: number;
  readonly indicesUtilises: number;
  /** Dates au format ISO 8601. */
  readonly debut: string;
  readonly maj: string;
};

/** Statistiques d'un jeu pour un niveau. */
export type StatsNiveau = {
  readonly terminees: number;
  /**
   * Parties remplacées par une nouvelle partie avant d'être finies (avec confirmation du joueur).
   * Compteur séparé : meilleur temps et moyennes ne portent que sur les parties terminées.
   */
  readonly abandonnees: number;
  /** null tant qu'aucune partie n'est terminée. */
  readonly meilleurTempsMs: number | null;
  /** Totaux : moyennes = total / terminees. */
  readonly totalTempsMs: number;
  readonly totalForce: number;
};

export type StatsJeu = Readonly<Record<Niveau, StatsNiveau>>;

/**
 * Grille d'avance de la réserve (générée en arrière-plan, servie une seule fois).
 * Clé de stockage : « <jeu>/<niveau>/<horodatage>-<compteur> » (les plus anciennes sont servies d'abord).
 */
export type EntreeReserve = {
  readonly jeu: string;
  readonly niveau: Niveau;
  /** Date d'ajout au format ISO 8601. */
  readonly ajouteLe: string;
  readonly puzzle: Puzzle<Json>;
};

/**
 * Avancement dans le pack d'un jeu pour un niveau (clé « <jeu>/<niveau> »).
 * Les grilles sont servies dans l'ordre « ordre » (indices mélangés) ; une fois toutes servies,
 * on recommence dans un nouvel ordre (cycle + 1).
 */
export type EtatPack = {
  /** Nombre de grilles du pack quand l'ordre a été tiré (s'il change, l'ordre est retiré). */
  readonly taille: number;
  /** Permutation des indices 0 … taille − 1. */
  readonly ordre: readonly number[];
  /** Nombre de grilles déjà servies dans ce cycle (prochaine = ordre[position]). */
  readonly position: number;
  /** Indice de la dernière grille servie (évite de la resservir en tête du cycle suivant). */
  readonly derniere: number | null;
  /** Numéro du cycle, à partir de 1. */
  readonly cycle: number;
};

/** Contenu du fichier d'export (sac2riz-sauvegarde-AAAA-MM-JJ.json). */
export type FichierExport = {
  readonly format: 'sac2riz-export';
  readonly version: 1;
  readonly exporteLe: string;
  readonly reglages: Reglages;
  readonly parties: readonly PartieSauvegardee[];
  readonly stats: { readonly [jeu: string]: StatsJeu };
};
