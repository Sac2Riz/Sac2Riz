// NOTATION des chiffres casés : niveau + force 1-10. Voir docs/DIFFICULTE.md. Code pur.
//
// - Niveau : celui de la technique la plus dure utilisée par le solveur logique.
// - Force : Expert = 9, Diabolique = 10 ; pour Débutant à Difficile, la valeur haute est retenue
//   si la grille est « dure pour son niveau » (voir estHaute).
// - Une grille que la logique ne résout pas n'est pas notée (null) : elle est rejetée.

import { INFOS_NIVEAUX, NIVEAUX, type Force, type Niveau, type Notation } from '../../types/niveaux.ts';
import type { Probleme } from './probleme.ts';
import { etatDepart, type PlacementSolveur } from './solveur/etat.ts';
import { resoudre } from './solveur/solveur.ts';
import { IDS_TECHNIQUES_CASES, type EtapeCases } from './solveur/technique.ts';

/**
 * Version de la notation des chiffres casés. À INCRÉMENTER dès qu'un seuil, une technique ou
 * l'ordre des techniques change (puis régénérer les packs du jeu s'il en a).
 */
export const VERSION_NOTATION_CASES = 1;

type NiveauADeuxForces = 'debutant' | 'facile' | 'moyen' | 'difficile';

/** Force haute si score ≥ score OU plus grand groupe de même longueur ≥ groupe (critère ignoré si null). */
export type SeuilsNiveauCases = { readonly score: number | null; readonly groupe: number | null };

export type SeuilsForceCases = Readonly<Record<NiveauADeuxForces, SeuilsNiveauCases>>;

/**
 * Seuils mesurés à l'étape 4a (200 grilles par niveau ; voir docs/DIFFICULTE.md) : environ une grille
 * sur deux en force haute. Débutant et Facile : le score ne distingue pas les grilles (il compte les
 * étapes de remplissage), c'est la taille du plus grand groupe de même longueur qui joue.
 * Toute modification impose d'incrémenter VERSION_NOTATION_CASES.
 */
export const SEUILS_FORCE_CASES: SeuilsForceCases = {
  debutant: { score: null, groupe: 9 },
  facile: { score: null, groupe: 13 },
  moyen: { score: 6, groupe: null },
  difficile: { score: 11, groupe: null },
};

export type MesuresCases = {
  /** Étapes du niveau max + ½ × étapes du niveau juste en dessous (compté seulement s'il est au moins Moyen). */
  readonly score: number;
  /** Taille du plus grand groupe de nombres de même longueur (ambiguïté). */
  readonly groupe: number;
  /** Nombres pré-placés. */
  readonly preplaces: number;
};

const RANG_MIN_NIVEAU_INFERIEUR = NIVEAUX.indexOf('moyen');

export function niveauDesEtapes(etapes: readonly EtapeCases[]): Niveau {
  let rang = 0;
  for (const e of etapes) rang = Math.max(rang, NIVEAUX.indexOf(e.niveau));
  return NIVEAUX[rang] ?? 'debutant';
}

export function mesurer(p: Probleme, etapes: readonly EtapeCases[], niveau: Niveau, preplaces: number): MesuresCases {
  const rang = NIVEAUX.indexOf(niveau);
  let score = 0;
  for (const e of etapes) {
    const r = NIVEAUX.indexOf(e.niveau);
    if (r === rang) score += 1;
    else if (r === rang - 1 && r >= RANG_MIN_NIVEAU_INFERIEUR) score += 0.5;
  }
  const groupe = Math.max(0, ...[...p.nombresParLongueur.values()].map((g) => g.length));
  return { score, groupe, preplaces };
}

function estADeuxForces(niveau: Niveau): niveau is NiveauADeuxForces {
  return INFOS_NIVEAUX[niveau].forceMin !== INFOS_NIVEAUX[niveau].forceMax;
}

export function calculerForce(niveau: Niveau, m: MesuresCases, seuils: SeuilsForceCases = SEUILS_FORCE_CASES): Force {
  const { forceMin, forceMax } = INFOS_NIVEAUX[niveau];
  if (!estADeuxForces(niveau)) return forceMin;
  const s = seuils[niveau];
  const haute = (s.score !== null && m.score >= s.score) || (s.groupe !== null && m.groupe >= s.groupe);
  return haute ? forceMax : forceMin;
}

/** Technique la plus avancée utilisée (ordre d'IDS_TECHNIQUES_CASES), ou 'aucune'. */
function techniqueLaPlusDure(etapes: readonly EtapeCases[]): string {
  let rang = -1;
  for (const { technique } of etapes) rang = Math.max(rang, IDS_TECHNIQUES_CASES.indexOf(technique));
  return IDS_TECHNIQUES_CASES[rang] ?? 'aucune';
}

/** Note une grille déjà résolue (étapes fournies). */
export function noterEtapes(p: Probleme, etapes: readonly EtapeCases[], preplaces: number): Notation {
  const niveau = niveauDesEtapes(etapes);
  const details: Record<string, number> = {};
  for (const { technique } of etapes) details[technique] = (details[technique] ?? 0) + 1;
  return {
    niveau,
    force: calculerForce(niveau, mesurer(p, etapes, niveau, preplaces)),
    techniqueMax: techniqueLaPlusDure(etapes),
    details,
  };
}

/** Note un problème avec ses nombres donnés ; null si la logique seule ne le résout pas. */
export function noterProbleme(p: Probleme, donnes: readonly PlacementSolveur[]): Notation | null {
  const r = resoudre(p, etatDepart(p, donnes));
  return r.statut === 'resolu' ? noterEtapes(p, r.etapes, donnes.length) : null;
}
