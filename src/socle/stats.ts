// STATISTIQUES par jeu et par niveau. Code pur : chaque fonction renvoie de nouvelles stats.
//
// - Partie terminée : +1 terminée, meilleur temps, totaux de temps et de force (moyennes =
//   total / terminées).
// - Partie abandonnée (remplacée par une nouvelle partie, après confirmation) : +1 au compteur
//   séparé « abandonnees », SANS toucher aux temps : meilleur temps et temps moyen ne portent
//   que sur les parties terminées.

import type { Force, Niveau } from '../types/niveaux.ts';
import type { StatsJeu, StatsNiveau } from '../types/sauvegarde.ts';

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

export function enregistrerTerminee(stats: StatsJeu, niveau: Niveau, tempsMs: number, force: Force): StatsJeu {
  const temps = Math.max(0, Math.round(tempsMs));
  return modifier(stats, niveau, (s) => ({
    ...s,
    terminees: s.terminees + 1,
    meilleurTempsMs: s.meilleurTempsMs === null ? temps : Math.min(s.meilleurTempsMs, temps),
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
