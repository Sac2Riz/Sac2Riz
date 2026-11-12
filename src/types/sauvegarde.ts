// Types des données conservées : réglages, partie en cours, statistiques, export.
// Tout est du JSON (déclaré avec « type ») pour IndexedDB et le fichier d'export.

import type { Puzzle } from './jeu.ts';
import type { Json } from './json.ts';
import type { Niveau } from './niveaux.ts';

export type Theme = 'systeme' | 'clair' | 'sombre';

export type Reglages = {
  /** « systeme » suit le thème clair/sombre de la tablette. */
  readonly theme: Theme;
  /** Signale les chiffres faux dès qu'ils sont posés. */
  readonly verifierErreurs: boolean;
};

export const REGLAGES_PAR_DEFAUT: Reglages = {
  theme: 'systeme',
  verifierErreurs: false,
};

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
  /** null tant qu'aucune partie n'est terminée. */
  readonly meilleurTempsMs: number | null;
  /** Totaux : moyennes = total / terminees. */
  readonly totalTempsMs: number;
  readonly totalForce: number;
};

export type StatsJeu = Readonly<Record<Niveau, StatsNiveau>>;

/** Contenu du fichier d'export (sac2riz-sauvegarde-AAAA-MM-JJ.json). */
export type FichierExport = {
  readonly format: 'sac2riz-export';
  readonly version: 1;
  readonly exporteLe: string;
  readonly reglages: Reglages;
  readonly parties: readonly PartieSauvegardee[];
  readonly stats: { readonly [jeu: string]: StatsJeu };
};
