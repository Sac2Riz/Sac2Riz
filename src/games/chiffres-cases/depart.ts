// NOMBRE AU DÉPART (réglage « Toujours placer un nombre au départ ») : une nouvelle grille sans aucun
// pré-placé en reçoit un, avec le statut d'un pré-placé (gras, verrouillé, non modifiable). Code pur,
// appelé dans le worker par LogiqueJeu.preparer.
//
// Choix du nombre : celui qui ouvre le mieux la grille en gardant, autant que possible, son niveau.
// 1. Ouverture : chaque emplacement est essayé comme pré-placé et le solveur n'utilise que les
//    techniques Débutant et Facile ; on compte les emplacements remplis avant qu'il soit bloqué (ce
//    que le joueur peut poser d'emblée par des déductions simples). Calcul rapide.
// 2. Les candidats sont classés par ouverture, puis par longueur (un nombre long donne plus de
//    chiffres), puis par emplacement (choix reproductible).
// 3. Dans cet ordre, on prend le premier qui GARDE LE NIVEAU de la grille avec une vraie ouverture
//    (au moins OUVERTURE_MIN emplacements) ; à défaut, le premier qui ne baisse le niveau que d'un
//    cran (une vraie ouverture vaut mieux qu'un niveau tenu à tout prix) ; à défaut, le premier qui
//    garde le niveau ; à défaut, celui qui baisse le moins le niveau.
//
// Pourquoi (mesures sur les packs, voir docs/DIFFICULTE.md) : le nombre qui « facilite le plus » la
// grille ramène presque tous les Expert et Diabolique au niveau Moyen, voire Débutant, et coûte
// jusqu'à 3 s sur PC ; les règles simples (nombre le plus long, longueur rare) n'ouvrent souvent
// presque rien et n'aident pas en Diabolique.

import { NIVEAUX, type Niveau } from '../../types/niveaux.ts';
import { noterCases } from './notation.ts';
import { structureDe } from './probleme.ts';
import { etatDepart } from './solveur/etat.ts';
import { resoudre } from './solveur/solveur.ts';
import type { DonneesCases } from './types.ts';

/** Ouverture minimale (emplacements posés d'emblée) pour qu'un nombre aide vraiment à démarrer. */
export const OUVERTURE_MIN = 3;

/** Emplacements remplis par les seules techniques Débutant et Facile, avec ce pré-placé. */
export function ouverture(donnees: DonneesCases, emplacement: number): number {
  const { probleme, solution } = structureDe(donnees);
  const depart = etatDepart(probleme, [{ emplacement, nombre: solution[emplacement] ?? -1 }]);
  return resoudre(probleme, depart, 'facile').etat.affectes.filter((n) => n >= 0).length;
}

const rang = (n: Niveau): number => NIVEAUX.indexOf(n);

/**
 * Emplacement à pré-placer, ou null si la grille a déjà un pré-placé (ou, cas qui ne devrait pas
 * arriver, si aucun candidat n'est résolu par la logique).
 */
export function emplacementAuDepart(donnees: DonneesCases): number | null {
  if (donnees.preplaces.length > 0) return null;
  const { grille } = structureDe(donnees).probleme;
  const classes = grille.emplacements
    .map((e) => ({ id: e.id, ouverture: ouverture(donnees, e.id), longueur: e.cellules.length }))
    .sort((a, b) => b.ouverture - a.ouverture || b.longueur - a.longueur || a.id - b.id);

  // Niveau de la grille (null : la logique ne la résout pas sans pré-placé ; tout niveau convient)
  const origine = noterCases(donnees);
  const viseRang = origine === null ? 0 : rang(origine.niveau);
  // Notations complètes calculées à la demande (les plus coûteuses), dans l'ordre du classement
  const notes = new Map<number, number | null>();
  const rangDe = (id: number): number | null => {
    if (!notes.has(id)) {
      const n = noterCases({ ...donnees, preplaces: [id] });
      notes.set(id, n === null ? null : rang(n.niveau));
    }
    return notes.get(id) ?? null;
  };
  const premier = (accepte: (c: (typeof classes)[number], r: number) => boolean): number | null => {
    for (const c of classes) {
      const r = rangDe(c.id);
      if (r !== null && accepte(c, r)) return c.id;
    }
    return null;
  };
  // Les candidats qui ouvrent assez sont en tête du classement : les deux premiers critères ne
  // notent qu'eux (au pire tous les emplacements, quelques dizaines de millisecondes sur PC)
  const ouvrent = (c: (typeof classes)[number]): boolean => c.ouverture >= OUVERTURE_MIN;
  return (
    premier((c, r) => ouvrent(c) && r >= viseRang) ??
    premier((c, r) => ouvrent(c) && r >= viseRang - 1) ??
    premier((_, r) => r >= viseRang) ??
    moinsFacile()
  );

  /** Dernier repli : aucun candidat ne garde le niveau ; celui qui le baisse le moins (puis le classement). */
  function moinsFacile(): number | null {
    let meilleur: { readonly id: number; readonly rang: number } | null = null;
    for (const c of classes) {
      const r = rangDe(c.id);
      if (r !== null && (meilleur === null || r > meilleur.rang)) meilleur = { id: c.id, rang: r };
    }
    return meilleur?.id ?? null;
  }
}

/** Données avec un nombre pré-placé ajouté si la grille n'en a aucun ; sinon les mêmes données (même objet). */
export function nombreAuDepart(donnees: DonneesCases): DonneesCases {
  const id = emplacementAuDepart(donnees);
  return id === null ? donnees : { ...donnees, preplaces: [id] };
}
