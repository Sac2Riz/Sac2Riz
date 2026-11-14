// DIRECTIONS DE DESIGN À L'ESSAI (étape 6b, TEMPORAIRE : le choix est retiré à l'étape 6c, quand une
// direction aura été retenue).
// Une direction = un attribut <html data-direction="<id>"> + une feuille src/styles/directions/<id>.css
// qui redéfinit les variables de theme.css, les polices, les décors et les icônes. Elle se combine avec
// le thème Automatique / Clair / Sombre. Ardoise (le style d'origine) = pas d'attribut.
// Le choix est gardé dans le stockage local du navigateur (localStorage), volontairement HORS des
// réglages IndexedDB : ni schéma, ni migration, ni export pour un choix qui va disparaître.

export const DIRECTIONS = [
  { id: 'ardoise', nom: 'Ardoise (actuel)' },
  { id: 'annees-80-90', nom: 'Années 80-90' },
  { id: 'ascii', nom: 'ASCII' },
  { id: 'ms-dos', nom: 'MS-DOS' },
  { id: 'bbs-ansi', nom: 'BBS ANSI' },
  { id: 'retro', nom: 'Rétro' },
  { id: 'ascii-generatif', nom: 'ASCII génératif' },
  { id: 'terminal', nom: 'Terminal' },
] as const;

export type Direction = (typeof DIRECTIONS)[number]['id'];

export const DIRECTION_PAR_DEFAUT: Direction = 'ardoise';

/** Clé du stockage local. */
export const CLE_DIRECTION = 'sac2riz-direction-essai';

/** Ce dont on a besoin du stockage local (injecté : null s'il est indisponible). */
export type StockageLocal = Pick<Storage, 'getItem' | 'setItem'>;

export function estDirection(valeur: unknown): valeur is Direction {
  return DIRECTIONS.some((d) => d.id === valeur);
}

/** Direction enregistrée ; Ardoise si rien, valeur inconnue ou stockage inaccessible. */
export function lireDirection(stockage: StockageLocal | null): Direction {
  try {
    const valeur = stockage?.getItem(CLE_DIRECTION) ?? null;
    return estDirection(valeur) ? valeur : DIRECTION_PAR_DEFAUT;
  } catch {
    return DIRECTION_PAR_DEFAUT; // navigation privée, stockage bloqué…
  }
}

export function ecrireDirection(stockage: StockageLocal | null, direction: Direction): void {
  try {
    stockage?.setItem(CLE_DIRECTION, direction);
  } catch {
    // Choix seulement pour cette session : sans gravité
  }
}

/** Valeur de l'attribut data-direction (null = pas d'attribut : Ardoise). */
export function attributDirection(direction: Direction): string | null {
  return direction === DIRECTION_PAR_DEFAUT ? null : direction;
}
