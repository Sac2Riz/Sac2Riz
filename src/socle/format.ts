// Mise en forme de textes affichés (temps, étoiles). Code pur, testé sous Node.

import { INFOS_NIVEAUX, type Niveau } from '../types/niveaux.ts';

/** Temps de jeu : « 4:07 », « 12:34 », « 1:02:03 » (secondes entières, arrondies vers le bas). */
export function formaterTemps(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secondes = String(total % 60).padStart(2, '0');
  return heures > 0 ? `${heures}:${String(minutes).padStart(2, '0')}:${secondes}` : `${minutes}:${secondes}`;
}

/** Étoiles d'un niveau : « ★★★ ». */
export function etoiles(niveau: Niveau): string {
  return '★'.repeat(INFOS_NIVEAUX[niveau].etoiles);
}
