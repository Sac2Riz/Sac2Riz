// GÉOMÉTRIE du Tectonic : cases qui se touchent, zones (numérotation, connexité, tailles) et bordures
// épaisses entre zones (pour la vue). Fonctions pures sur (lignes, colonnes, carte des zones).

/** Nom lisible d'une case : « L3C5 » (ligne 3, colonne 5, comptées à partir de 1). */
export function nomCase(colonnes: number, cellule: number): string {
  return `L${Math.floor(cellule / colonnes) + 1}C${(cellule % colonnes) + 1}`;
}

/** Les cases qui touchent la case, par un côté ou en diagonale (3 à 8 cases), triées. */
export function casesAutour(lignes: number, colonnes: number, cellule: number): number[] {
  const l = Math.floor(cellule / colonnes);
  const c = cellule % colonnes;
  const autour: number[] = [];
  for (let dl = -1; dl <= 1; dl++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nl = l + dl;
      const nc = c + dc;
      if ((dl !== 0 || dc !== 0) && nl >= 0 && nl < lignes && nc >= 0 && nc < colonnes) autour.push(nl * colonnes + nc);
    }
  }
  return autour;
}

/** Les cases qui partagent un côté avec la case (2 à 4 cases), triées. */
export function casesCote(lignes: number, colonnes: number, cellule: number): number[] {
  const l = Math.floor(cellule / colonnes);
  const c = cellule % colonnes;
  const cote: number[] = [];
  if (l > 0) cote.push(cellule - colonnes);
  if (c > 0) cote.push(cellule - 1);
  if (c + 1 < colonnes) cote.push(cellule + 1);
  if (l + 1 < lignes) cote.push(cellule + colonnes);
  return cote;
}

/**
 * Carte renumérotée dans l'ordre de lecture : la zone de la case 0 devient 0, la zone suivante
 * rencontrée 1, etc. Deux découpages identiques ont ainsi toujours la même carte.
 */
export function numeroterZones(carte: readonly number[]): number[] {
  const nouveaux = new Map<number, number>();
  return carte.map((numero) => {
    const connu = nouveaux.get(numero);
    if (connu !== undefined) return connu;
    nouveaux.set(numero, nouveaux.size);
    return nouveaux.size - 1;
  });
}

/** Vrai si la carte est déjà numérotée dans l'ordre de lecture. */
export function estNumerotee(carte: readonly number[]): boolean {
  return numeroterZones(carte).every((n, i) => n === carte[i]);
}

/** Cases de chaque zone (indice = numéro de zone), triées. */
export function cellulesDesZones(carte: readonly number[]): number[][] {
  const zones: number[][] = [];
  carte.forEach((numero, cellule) => {
    (zones[numero] ??= []).push(cellule);
  });
  return zones;
}

/** Vrai si chaque zone est d'un seul tenant (cases reliées par leurs côtés). */
export function zonesConnexes(lignes: number, colonnes: number, carte: readonly number[]): boolean {
  return cellulesDesZones(carte).every((cellules) => {
    const depart = cellules[0];
    if (depart === undefined) return false;
    const vues = new Set([depart]);
    const pile = [depart];
    for (let c = pile.pop(); c !== undefined; c = pile.pop()) {
      for (const v of casesCote(lignes, colonnes, c)) {
        if (!vues.has(v) && carte[v] === carte[c]) {
          vues.add(v);
          pile.push(v);
        }
      }
    }
    return vues.size === cellules.length;
  });
}

/** Côtés d'une case dessinés en trait épais : bord de la grille, ou case voisine d'une autre zone. */
export type Bordure = {
  readonly haut: boolean;
  readonly droite: boolean;
  readonly bas: boolean;
  readonly gauche: boolean;
};

/** Bordures de chaque case (pour la vue : traits épais entre les zones). */
export function bordures(lignes: number, colonnes: number, carte: readonly number[]): Bordure[] {
  return carte.map((zone, cellule) => {
    const l = Math.floor(cellule / colonnes);
    const c = cellule % colonnes;
    const autre = (voisine: number): boolean => carte[voisine] !== zone;
    return {
      haut: l === 0 || autre(cellule - colonnes),
      droite: c === colonnes - 1 || autre(cellule + 1),
      bas: l === lignes - 1 || autre(cellule + colonnes),
      gauche: c === 0 || autre(cellule - 1),
    };
  });
}
