// GÉOMÉTRIE d'une grille de chiffres casés : emplacements, croisements, connexité. Code pur.
//
// Numérotation des emplacements (fixe : les données des parties en dépendent) : par première case
// dans l'ordre de lecture (ligne par ligne, de gauche à droite) ; à première case égale,
// l'horizontal avant le vertical.

import { LONGUEUR_MIN } from './types.ts';

export type Sens = 'horizontal' | 'vertical';

export type Emplacement = {
  readonly id: number;
  readonly sens: Sens;
  /** Cases, dans l'ordre de lecture du nombre (gauche → droite ou haut → bas). */
  readonly cellules: readonly number[];
};

/** Croisement d'un emplacement avec un autre. */
export type Croisement = {
  readonly cellule: number;
  readonly autre: number;
  /** Position de la case dans l'emplacement, puis dans l'autre. */
  readonly position: number;
  readonly positionAutre: number;
};

export type Grille = {
  readonly largeur: number;
  readonly hauteur: number;
  readonly noires: readonly boolean[];
  readonly emplacements: readonly Emplacement[];
  /** Emplacements qui passent par chaque case (0, 1 ou 2). */
  readonly parCase: readonly (readonly number[])[];
  /** Croisements de chaque emplacement. */
  readonly croisements: readonly (readonly Croisement[])[];
};

/** Suites de cases blanches d'au moins LONGUEUR_MIN cases dans un sens donné. */
function suites(largeur: number, hauteur: number, noires: readonly boolean[], sens: Sens): number[][] {
  const resultat: number[][] = [];
  const [externe, interne] = sens === 'horizontal' ? [hauteur, largeur] : [largeur, hauteur];
  for (let a = 0; a < externe; a++) {
    let courante: number[] = [];
    for (let b = 0; b <= interne; b++) {
      const cellule = sens === 'horizontal' ? a * largeur + b : b * largeur + a;
      if (b < interne && noires[cellule] !== true) {
        courante.push(cellule);
        continue;
      }
      if (courante.length >= LONGUEUR_MIN) resultat.push(courante);
      courante = [];
    }
  }
  return resultat;
}

/** Construit la grille (emplacements numérotés, croisements) à partir des cases noires. */
export function grilleDe(largeur: number, hauteur: number, noires: readonly boolean[]): Grille {
  const brutes = [
    ...suites(largeur, hauteur, noires, 'horizontal').map((cellules) => ({ sens: 'horizontal' as const, cellules })),
    ...suites(largeur, hauteur, noires, 'vertical').map((cellules) => ({ sens: 'vertical' as const, cellules })),
  ];
  brutes.sort((a, b) => (a.cellules[0] ?? 0) - (b.cellules[0] ?? 0) || (a.sens === 'horizontal' ? -1 : 1));
  const emplacements: Emplacement[] = brutes.map((e, id) => ({ id, sens: e.sens, cellules: e.cellules }));

  const parCase: number[][] = noires.map(() => []);
  for (const e of emplacements) for (const c of e.cellules) parCase[c]?.push(e.id);

  const croisements = emplacements.map((e) =>
    e.cellules.flatMap((cellule, position) => {
      const autre = (parCase[cellule] ?? []).find((id) => id !== e.id);
      if (autre === undefined) return [];
      const positionAutre = emplacements[autre]?.cellules.indexOf(cellule) ?? -1;
      return [{ cellule, autre, position, positionAutre }];
    }),
  );
  return { largeur, hauteur, noires: [...noires], emplacements, parCase, croisements };
}

/** Cases blanches qui n'appartiennent à aucun emplacement (interdites). */
export function casesIsolees(grille: Grille): number[] {
  return grille.noires.flatMap((noire, c) => (!noire && (grille.parCase[c] ?? []).length === 0 ? [c] : []));
}

/** Vrai si toutes les cases blanches forment un seul bloc (voisines par un côté). */
export function estConnexe(grille: Grille): boolean {
  const { largeur, hauteur, noires } = grille;
  const depart = noires.findIndex((n) => !n);
  if (depart < 0) return false;
  const vues = new Set<number>([depart]);
  const pile = [depart];
  while (pile.length > 0) {
    const c = pile.pop() ?? 0;
    const l = Math.floor(c / largeur);
    const col = c % largeur;
    const voisines = [
      l > 0 ? c - largeur : -1,
      l < hauteur - 1 ? c + largeur : -1,
      col > 0 ? c - 1 : -1,
      col < largeur - 1 ? c + 1 : -1,
    ];
    for (const v of voisines) {
      if (v >= 0 && noires[v] === false && !vues.has(v)) {
        vues.add(v);
        pile.push(v);
      }
    }
  }
  return vues.size === noires.filter((n) => !n).length;
}

/** Vrai si les cases noires sont symétriques par rapport au centre. */
export function estSymetrique(grille: Grille): boolean {
  const n = grille.noires.length;
  return grille.noires.every((noire, c) => noire === grille.noires[n - 1 - c]);
}

/** Nombre écrit dans un emplacement d'après les chiffres des cases. */
export function nombreDe(emplacement: Emplacement, chiffres: readonly number[]): string {
  return emplacement.cellules.map((c) => String(chiffres[c] ?? 0)).join('');
}

/** Nom d'une case pour les explications : « L3C5 ». */
export function nomCase(grille: Grille, cellule: number): string {
  return `L${Math.floor(cellule / grille.largeur) + 1}C${(cellule % grille.largeur) + 1}`;
}

/** Nom d'un emplacement pour les explications, avec son article : « l'horizontal en L3C2 », « le vertical en L1C4 ». */
export function nomEmplacement(grille: Grille, id: number): string {
  const e = grille.emplacements[id];
  if (e === undefined) return `l'emplacement ${id}`;
  return `${e.sens === 'horizontal' ? 'l\'horizontal' : 'le vertical'} en ${nomCase(grille, e.cellules[0] ?? 0)}`;
}
