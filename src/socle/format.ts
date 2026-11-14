// Mise en forme de textes affichés (temps, niveaux et force). Code pur, testé sous Node.

import { INFOS_NIVEAUX, type Force, type Niveau } from '../types/niveaux.ts';

/** Temps de jeu : « 4:07 », « 12:34 », « 1:02:03 » (secondes entières, arrondies vers le bas). */
export function formaterTemps(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secondes = String(total % 60).padStart(2, '0');
  return heures > 0 ? `${heures}:${String(minutes).padStart(2, '0')}:${secondes}` : `${minutes}:${secondes}`;
}

/** Plage de force d'un niveau : « Force 1-2 », « Force 9 ». */
export function plageForce(niveau: Niveau): string {
  const { forceMin, forceMax } = INFOS_NIVEAUX[niveau];
  return forceMin === forceMax ? `Force ${forceMin}` : `Force ${forceMin}-${forceMax}`;
}

/** Niveau avec sa plage de force (choix du niveau, statistiques) : « Débutant · Force 1-2 ». */
export function libelleNiveau(niveau: Niveau): string {
  return `${INFOS_NIVEAUX[niveau].nom} · ${plageForce(niveau)}`;
}

/** Niveau avec la force exacte d'une grille (partie, fin de partie) : « Moyen · Force 6 ». */
export function libelleForce(niveau: Niveau, force: Force): string {
  return `${INFOS_NIVEAUX[niveau].nom} · Force ${force}`;
}
