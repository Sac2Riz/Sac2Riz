// Types des données conservées : réglages, partie en cours, statistiques, export.
// Tout est du JSON (déclaré avec « type ») pour IndexedDB et le fichier d'export.

import type { Puzzle, ValeursReglagesJeu } from './jeu.ts';
import type { Json } from './json.ts';
import type { Niveau } from './niveaux.ts';
import { STYLE_PAR_DEFAUT, type Style } from './style.ts';

export type Theme = 'systeme' | 'clair' | 'sombre';

/**
 * Réglages du joueur (étape 6a), en trois sections dans l'écran des réglages :
 * - Application : style, thème (la sauvegarde et la version ne sont pas des réglages enregistrés) ;
 * - Tous les jeux : vérification des erreurs, mise en évidence ;
 * - Par jeu : réglages déclarés par chaque jeu (MetaJeu.reglages), rangés par id de jeu.
 */
export type Reglages = {
  /** Style de l'appli (src/types/style.ts), étape 6c. */
  readonly style: Style;
  /** « systeme » suit le thème clair/sombre de la tablette. */
  readonly theme: Theme;
  /** Signale les cases fausses (comparaison avec la solution). */
  readonly verifierErreurs: boolean;
  /** Aides visuelles autour de la case choisie (sudoku : ligne, colonne, bloc, chiffres identiques). */
  readonly miseEnEvidence: boolean;
  /**
   * Réglages propres aux jeux : jeux[idJeu][idReglage]. Seuls les réglages déjà changés ou repris
   * d'une ancienne version y figurent ; les autres prennent la valeur par défaut déclarée par le jeu.
   * Les réglages d'un jeu inconnu de cette version sont conservés tels quels.
   */
  readonly jeux: { readonly [jeu: string]: ValeursReglagesJeu };
};

export const REGLAGES_PAR_DEFAUT: Reglages = {
  style: STYLE_PAR_DEFAUT,
  theme: 'systeme',
  verifierErreurs: false,
  miseEnEvidence: true,
  jeux: {},
};

/**
 * Réglages tels que relus du stockage ou d'un fichier, dans la forme actuelle mais avec un style et
 * des valeurs de jeu non encore vérifiés (une valeur inconnue est remplacée par la valeur par défaut,
 * ou ignorée pour un jeu, sans perdre les autres).
 */
export type ReglagesBruts = ReglagesV4 & { readonly style: Json };

/** Réglages par section des étapes 6a et 6b (avant le style). */
export type ReglagesV4 = {
  readonly theme: Theme;
  readonly verifierErreurs: boolean;
  readonly miseEnEvidence: boolean;
  readonly jeux: { readonly [jeu: string]: { readonly [id: string]: Json } };
};

/** Réglages « à plat » enregistrés par les étapes 4b à 5 (avant les réglages par jeu). */
export type ReglagesV3 = {
  readonly theme: Theme;
  readonly verifierErreurs: boolean;
  readonly miseEnEvidence: boolean;
  /** Devenu un réglage du sudoku classique. */
  readonly retraitAutoNotes: boolean;
  /** Devenu un réglage des chiffres casés. */
  readonly nombreAuDepart: boolean;
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

/** Ce que le magasin « reglages » peut contenir : forme actuelle ou ancienne (convertie à la lecture). */
export type ReglagesEnregistres = ReglagesBruts | ReglagesV4 | ReglagesV3 | ReglagesV2 | ReglagesV1;

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

/**
 * Données de l'appli sauvegardées dans le fichier d'export et remplacées à l'import.
 * La réserve n'en fait pas partie : ce ne sont que des grilles d'avance, régénérées toutes seules.
 */
export type DonneesExportees = {
  readonly reglages: Reglages;
  /** Parties en cours (au plus une par jeu). */
  readonly parties: readonly PartieSauvegardee[];
  /** Statistiques par id de jeu. */
  readonly stats: { readonly [jeu: string]: StatsJeu };
  /** Avancement dans les packs, par clé « <jeu>/<niveau> » (évite de rejouer les mêmes grilles). */
  readonly packsJoues: { readonly [cle: string]: EtatPack };
};

/**
 * Version du format du fichier d'export (à incrémenter si sa forme change, avec conversion à l'import).
 * 1 : réglages « à plat » (étape 5) ; 2 : réglages par section, avec les réglages par jeu (étape 6a) ;
 * 3 : réglages avec le style (étape 6c).
 * L'import accepte les trois (réglages d'un fichier n° 1 convertis, style par défaut avant le n° 3).
 */
export const VERSION_EXPORT = 3;

/** Contenu du fichier d'export (sac2riz-sauvegarde-AAAA-MM-JJ.json). */
export type FichierExport = {
  readonly format: 'sac2riz-export';
  readonly version: typeof VERSION_EXPORT;
  /** Date de l'export au format ISO 8601. */
  readonly exporteLe: string;
  readonly donnees: DonneesExportees;
};
