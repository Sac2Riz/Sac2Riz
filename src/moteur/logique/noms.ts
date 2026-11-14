// Noms en français des cases et des régions, pour les explications des étapes. Code pur.

import type { Cellule } from '../../types/grille.ts';
import { cellulesDe, type Contexte } from './contexte.ts';

/** Nom d'une case : « L3C5 » = ligne 3, colonne 5 (numérotées à partir de 1). */
export function nomCellule(ctx: Contexte, cellule: Cellule): string {
  return `L${Math.floor(cellule / ctx.colonnes) + 1}C${(cellule % ctx.colonnes) + 1}`;
}

/** Nom d'une région, avec son article : « la ligne 3 », « le bloc 2 », « la diagonale ↘ »… */
export function nomRegion(ctx: Contexte, region: number): string {
  const rang = ctx.rangs[region] ?? 0;
  switch (ctx.formes[region]) {
    case 'ligne':
      return `la ligne ${rang}`;
    case 'colonne':
      return `la colonne ${rang}`;
    case 'bloc':
      return `le bloc ${rang}`;
    case 'diagonale': {
      // Diagonale descendante vers la droite (↘) si la colonne augmente avec la ligne
      const cellules = cellulesDe(ctx, region);
      const pas = (cellules[1] ?? 0) - (cellules[0] ?? 0);
      return pas === ctx.colonnes + 1 ? 'la diagonale ↘' : 'la diagonale ↙';
    }
    case 'irreguliere':
      return `la région ${rang}`;
    case 'zone':
      // Zone du Tectonic : nommée par sa première case (les numéros de zone ne se voient pas sur la grille)
      return `la zone de ${nomCellule(ctx, cellulesDe(ctx, region)[0] ?? 0)}`;
    case 'carre': {
      const cellules = cellulesDe(ctx, region);
      return `le carré ${nomCellule(ctx, cellules[0] ?? 0)}-${nomCellule(ctx, cellules[cellules.length - 1] ?? 0)}`;
    }
    default:
      return `la cage ${rang}`;
  }
}

/** Met la première lettre en majuscule. */
export function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** « a », « a et b », « a, b et c ». */
export function listeFr(elements: readonly string[]): string {
  if (elements.length <= 1) return elements[0] ?? '';
  return `${elements.slice(0, -1).join(', ')} et ${elements[elements.length - 1] ?? ''}`;
}

/** Liste de cases : « L1C2, L1C5 et L3C3 ». */
export function nomsCellules(ctx: Contexte, cellules: readonly Cellule[]): string {
  return listeFr(cellules.map((c) => nomCellule(ctx, c)));
}

/** Liste de régions : « la ligne 2 et la ligne 7 ». */
export function nomsRegions(ctx: Contexte, regions: readonly number[]): string {
  return listeFr(regions.map((r) => nomRegion(ctx, r)));
}

/** Ensemble de valeurs : « {2, 7} ». */
export function ensemble(valeurs: readonly number[]): string {
  return `{${valeurs.join(', ')}}`;
}
