// RÈGLES du joueur aux chiffres casés : placer / effacer un nombre, chiffres affichés, nombres
// utilisés, erreurs, fin de partie. Code pur (aucune mutation).
//
// Placer un nombre (décisions de l'étape 4) :
// - le nombre doit être dans la liste et avoir la longueur de l'emplacement ; un emplacement
//   pré-placé ne change jamais ;
// - s'il était déjà posé ailleurs, il y est retiré (DÉPLACEMENT) ;
// - s'il contredit un nombre qui le croise (chiffre différent dans une case commune), pré-placé ou
//   non, il n'est PAS posé : l'état ne change pas (le nombre croisé n'est jamais retiré). La vue fait
//   clignoter les cases en conflit : consequencesPlacement les lui donne AVANT de jouer l'action.
//   L'indice n'est jamais refusé : il signale d'abord les nombres faux, puis ne pose que des nombres
//   de la solution, qui ne contredisent aucun nombre juste.

import { structureDe } from './probleme.ts';
import type { DonneesCases, EtatCases } from './types.ts';

/** Ce que produirait le placement d'un nombre (la vue s'en sert pour son signal visuel). */
export type ConsequencesPlacement = {
  /** Faux si le placement est refusé (nombre hors liste, mauvaise longueur, conflit, pré-placé en jeu…). */
  readonly possible: boolean;
  /** Emplacement d'où le nombre est déplacé, ou null. */
  readonly deplaceDepuis: number | null;
  /** Cases communes où un nombre croisé déjà posé a un autre chiffre (placement alors refusé). */
  readonly conflits: readonly number[];
};

const IMPOSSIBLE: ConsequencesPlacement = { possible: false, deplaceDepuis: null, conflits: [] };

/** Emplacements pré-placés (ensemble). */
function preplaces(donnees: DonneesCases): ReadonlySet<number> {
  return new Set(donnees.preplaces);
}

export function consequencesPlacement(
  etat: EtatCases,
  donnees: DonneesCases,
  emplacement: number,
  nombre: string,
): ConsequencesPlacement {
  const { probleme: p } = structureDe(donnees);
  const e = p.grille.emplacements[emplacement];
  const fixes = preplaces(donnees);
  if (e === undefined || fixes.has(emplacement) || nombre.length !== e.cellules.length || !p.nombres.includes(nombre)) {
    return IMPOSSIBLE;
  }
  if (etat.places[emplacement] === nombre) return IMPOSSIBLE; // déjà là : rien à faire
  const ailleurs = etat.places.findIndex((n, i) => n === nombre && i !== emplacement);
  if (ailleurs >= 0 && fixes.has(ailleurs)) return IMPOSSIBLE; // un nombre donné ne se déplace pas
  // Le nombre déplacé quitte son ancien emplacement : il ne compte pas comme nombre croisé
  const conflits: number[] = [];
  for (const cr of p.grille.croisements[emplacement] ?? []) {
    const autre = etat.places[cr.autre] ?? null;
    if (autre === null || cr.autre === ailleurs || autre[cr.positionAutre] === nombre[cr.position]) continue;
    const cellule = e.cellules[cr.position];
    if (cellule !== undefined) conflits.push(cellule);
  }
  if (conflits.length > 0) return { possible: false, deplaceDepuis: null, conflits };
  return { possible: true, deplaceDepuis: ailleurs >= 0 ? ailleurs : null, conflits: [] };
}

/** Place un nombre (état inchangé, même objet, si le placement est impossible ou sans effet). */
export function placerNombre(etat: EtatCases, donnees: DonneesCases, emplacement: number, nombre: string): EtatCases {
  const c = consequencesPlacement(etat, donnees, emplacement, nombre);
  if (!c.possible) return etat;
  return {
    places: etat.places.map((n, i) => (i === emplacement ? nombre : i === c.deplaceDepuis ? null : n)),
  };
}

/** Efface un emplacement (jamais un pré-placé). */
export function effacerEmplacement(etat: EtatCases, donnees: DonneesCases, emplacement: number): EtatCases {
  if ((etat.places[emplacement] ?? null) === null || preplaces(donnees).has(emplacement)) return etat;
  return { places: etat.places.map((n, i) => (i === emplacement ? null : n)) };
}

/** État au début d'une partie : seuls les pré-placés sont remplis. */
export function etatInitialCases(donnees: DonneesCases): EtatCases {
  const { solutionTexte } = structureDe(donnees);
  const fixes = preplaces(donnees);
  return { places: solutionTexte.map((n, i) => (fixes.has(i) ? n : null)) };
}

/** Chiffre affiché dans chaque case (null : case noire ou vide). */
export function chiffresDesCases(etat: EtatCases, donnees: DonneesCases): (number | null)[] {
  const { probleme: p } = structureDe(donnees);
  const chiffres: (number | null)[] = p.grille.noires.map(() => null);
  for (const e of p.grille.emplacements) {
    const n = etat.places[e.id] ?? null;
    if (n === null) continue;
    e.cellules.forEach((c, i) => {
      chiffres[c] = Number(n[i]);
    });
  }
  return chiffres;
}

/**
 * Nombres de la liste à barrer : ceux posés, et ceux entièrement écrits par les nombres croisés
 * dans un emplacement resté vide. Triés comme la liste.
 */
export function nombresUtilises(etat: EtatCases, donnees: DonneesCases): string[] {
  const { probleme: p } = structureDe(donnees);
  const chiffres = chiffresDesCases(etat, donnees);
  const utilises = new Set<string>();
  for (const e of p.grille.emplacements) {
    const pose = etat.places[e.id] ?? null;
    if (pose !== null) {
      utilises.add(pose);
      continue;
    }
    const lus = e.cellules.map((c) => chiffres[c] ?? null);
    if (lus.every((v) => v !== null)) utilises.add(lus.join(''));
  }
  return p.nombres.filter((n) => utilises.has(n));
}

/** Emplacements (hors pré-placés) dont le nombre posé n'est pas celui de la solution. */
export function emplacementsFaux(etat: EtatCases, donnees: DonneesCases): number[] {
  const { solutionTexte } = structureDe(donnees);
  return etat.places.flatMap((n, i) => (n !== null && n !== solutionTexte[i] ? [i] : []));
}

/** Cases dont le chiffre affiché diffère de la solution. */
export function casesFausses(etat: EtatCases, donnees: DonneesCases): number[] {
  return chiffresDesCases(etat, donnees).flatMap((v, c) => (v !== null && v !== donnees.solution[c] ? [c] : []));
}

/** Toutes les cases blanches sont remplies avec le bon chiffre. */
export function estTermineeCases(etat: EtatCases, donnees: DonneesCases): boolean {
  const chiffres = chiffresDesCases(etat, donnees);
  return donnees.solution.every((v, c) => v < 0 || chiffres[c] === v);
}
