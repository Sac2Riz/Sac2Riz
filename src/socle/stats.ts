// STATISTIQUES par jeu et par niveau. Code pur : chaque fonction renvoie de nouvelles stats.
//
// - Partie terminée : +1 terminée, totaux de temps et de force (moyennes = total / terminées),
//   meilleur temps — SAUF si des indices ont été utilisés : la partie compte alors dans les
//   terminées et les moyennes, mais ne peut pas battre le record.
// - Partie abandonnée (remplacée par une nouvelle partie, après confirmation) : +1 au compteur
//   séparé « abandonnees », SANS toucher aux temps : meilleur temps et temps moyen ne portent
//   que sur les parties terminées.

import type { Force, Niveau } from '../types/niveaux.ts';
import type { StatsJeu, StatsNiveau } from '../types/sauvegarde.ts';
import { formaterTemps, libelleNiveau } from './format.ts';

export const STATS_NIVEAU_VIDES: StatsNiveau = {
  terminees: 0,
  abandonnees: 0,
  meilleurTempsMs: null,
  totalTempsMs: 0,
  totalForce: 0,
};

export function statsVides(): StatsJeu {
  const v = STATS_NIVEAU_VIDES;
  return { debutant: v, facile: v, moyen: v, difficile: v, expert: v, diabolique: v };
}

function modifier(stats: StatsJeu, niveau: Niveau, changer: (s: StatsNiveau) => StatsNiveau): StatsJeu {
  return { ...stats, [niveau]: changer(stats[niveau]) };
}

/** Vrai si ce temps bat le record (premier temps du niveau ou meilleur), sans indice. */
export function estNouveauRecord(stats: StatsNiveau, tempsMs: number, indicesUtilises: number): boolean {
  if (indicesUtilises > 0) return false;
  return stats.meilleurTempsMs === null || Math.round(tempsMs) < stats.meilleurTempsMs;
}

export function enregistrerTerminee(
  stats: StatsJeu,
  niveau: Niveau,
  tempsMs: number,
  force: Force,
  indicesUtilises: number,
): StatsJeu {
  const temps = Math.max(0, Math.round(tempsMs));
  return modifier(stats, niveau, (s) => ({
    ...s,
    terminees: s.terminees + 1,
    meilleurTempsMs: estNouveauRecord(s, temps, indicesUtilises) ? temps : s.meilleurTempsMs,
    totalTempsMs: s.totalTempsMs + temps,
    totalForce: s.totalForce + force,
  }));
}

export function enregistrerAbandon(stats: StatsJeu, niveau: Niveau): StatsJeu {
  return modifier(stats, niveau, (s) => ({ ...s, abandonnees: s.abandonnees + 1 }));
}

/** Temps moyen des parties terminées, ou null s'il n'y en a aucune. */
export function tempsMoyenMs(stats: StatsNiveau): number | null {
  return stats.terminees === 0 ? null : stats.totalTempsMs / stats.terminees;
}

/** Force moyenne des parties terminées, ou null s'il n'y en a aucune. */
export function forceMoyenne(stats: StatsNiveau): number | null {
  return stats.terminees === 0 ? null : stats.totalForce / stats.terminees;
}

/** Une ligne du tableau des statistiques (textes prêts à afficher ; « — » quand il n'y a rien). */
export type LigneStats = {
  readonly niveau: string;
  readonly terminees: string;
  readonly abandonnees: string;
  readonly meilleurTemps: string;
  readonly tempsMoyen: string;
  readonly forceMoyenne: string;
};

const RIEN = '—';

export function lignesStats(stats: StatsJeu, niveaux: readonly Niveau[]): LigneStats[] {
  return niveaux.map((niveau) => {
    const s = stats[niveau];
    const moyen = tempsMoyenMs(s);
    const force = forceMoyenne(s);
    return {
      niveau: libelleNiveau(niveau),
      terminees: String(s.terminees),
      abandonnees: String(s.abandonnees),
      meilleurTemps: s.meilleurTempsMs === null ? RIEN : formaterTemps(s.meilleurTempsMs),
      tempsMoyen: moyen === null ? RIEN : formaterTemps(moyen),
      forceMoyenne: force === null ? RIEN : force.toLocaleString('fr-FR', { maximumFractionDigits: 1 }),
    };
  });
}
