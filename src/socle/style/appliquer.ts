// Application du style et du thème à la page (réglages « Style » et « Thème »).
// Au démarrage, public/demarrage.js a déjà posé data-style et data-theme d'après la copie locale
// (voir affichage.ts) : ici, on applique les réglages d'IndexedDB (la référence) et on tient la
// copie à jour.

import type { Reglages } from '../../types/sauvegarde.ts';
import { estStyle, STYLE_PAR_DEFAUT, type Style } from '../../types/style.ts';
import { appliquerTheme } from '../theme.ts';
import { ecrireAffichage, type StockageLocal } from './affichage.ts';

/** Stockage local du navigateur, ou null s'il est inaccessible (son simple accès peut lever une erreur). */
export function stockageLocal(): StockageLocal | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Style affiché : celui posé par demarrage.js, puis par appliquerAffichage. */
export function styleCourant(): Style {
  const valeur = document.documentElement.dataset['style'];
  return estStyle(valeur) ? valeur : STYLE_PAR_DEFAUT;
}

/** Écouteurs d'un changement de style (décors animés). */
const ecouteurs = new Set<(s: Style) => void>();

export function suivreStyle(ecouteur: (s: Style) => void): void {
  ecouteurs.add(ecouteur);
}

/**
 * Applique le style et le thème des réglages (pose data-style ; data-theme et couleur de la barre
 * d'état par appliquerTheme), puis met à jour la copie locale.
 */
export function appliquerAffichage(reglages: Pick<Reglages, 'style' | 'theme'>): void {
  const change = styleCourant() !== reglages.style || document.documentElement.dataset['style'] === undefined;
  document.documentElement.dataset['style'] = reglages.style;
  appliquerTheme(reglages.theme);
  ecrireAffichage(stockageLocal(), { style: reglages.style, theme: reglages.theme });
  if (change) for (const e of ecouteurs) e(reglages.style);
}
