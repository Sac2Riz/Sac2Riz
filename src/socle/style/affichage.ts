// COPIE LOCALE DE L'AFFICHAGE et REPRISE DE L'ANCIEN CHOIX D'ESSAI. Code pur (stockage injecté).
//
// Le style et le thème sont des réglages (IndexedDB, inclus dans l'export) ; mais IndexedDB se lit
// de façon asynchrone, donc après le premier affichage. Pour que la page s'affiche directement dans
// le bon style, sans clignotement, une COPIE { style, theme } est gardée dans le stockage local du
// navigateur (lecture synchrone) et lue par public/demarrage.js, chargé avant tout affichage.
// IndexedDB reste la référence : la copie est réécrite à chaque démarrage et à chaque changement.
//
// Reprise unique : l'étape 6b gardait le style choisi à l'essai dans la clé CLE_ESSAI du stockage
// local. Au premier démarrage qui la trouve, sa valeur est reprise dans les réglages, puis la clé est
// supprimée (Années 80-90 et Terminal, retirés à l'étape 6c, deviennent Rétro).

import type { Theme } from '../../types/sauvegarde.ts';
import { estStyle, STYLE_PAR_DEFAUT, type Style } from '../../types/style.ts';

/** Clé de la copie { style, theme } (lue aussi par public/demarrage.js : ne pas la changer seule). */
export const CLE_AFFICHAGE = 'sac2riz-affichage';

/** Ancienne clé du sélecteur d'essai de l'étape 6b (lue aussi par public/demarrage.js). */
export const CLE_ESSAI = 'sac2riz-direction-essai';

/** Ce dont on a besoin du stockage local (injecté : null s'il est inaccessible). */
export type StockageLocal = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Copie enregistrée. */
export type Affichage = { readonly style: Style; readonly theme: Theme };

/**
 * Style correspondant à une valeur du sélecteur d'essai : un style conservé tel quel, sinon Rétro
 * (Années 80-90, Terminal, ou une valeur inconnue) ; null s'il n'y a rien (pas de clé).
 */
export function styleDeLEssai(valeur: string | null): Style | null {
  if (valeur === null) return null;
  return estStyle(valeur) ? valeur : STYLE_PAR_DEFAUT;
}

/** Style choisi à l'essai (étape 6b), ou null s'il n'y en a pas ou si le stockage est inaccessible. */
export function lireEssai(stockage: StockageLocal | null): Style | null {
  try {
    return styleDeLEssai(stockage?.getItem(CLE_ESSAI) ?? null);
  } catch {
    return null; // navigation privée, stockage bloqué…
  }
}

/** Supprime l'ancienne clé d'essai (après sa reprise dans les réglages). */
export function oublierEssai(stockage: StockageLocal | null): void {
  try {
    stockage?.removeItem(CLE_ESSAI);
  } catch {
    // Sans gravité : la reprise donnerait le même résultat au prochain démarrage
  }
}

/** Écrit la copie de l'affichage ; sans effet si le stockage est inaccessible. */
export function ecrireAffichage(stockage: StockageLocal | null, affichage: Affichage): void {
  try {
    stockage?.setItem(CLE_AFFICHAGE, JSON.stringify({ style: affichage.style, theme: affichage.theme }));
  } catch {
    // Sans gravité : seul le premier affichage du prochain démarrage pourrait être dans un autre style
  }
}
