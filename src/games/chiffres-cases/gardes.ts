// GARDES DE TYPE des chiffres casés : elles vérifient une valeur venant d'une sauvegarde ou d'un
// import avant de l'utiliser comme D, E ou A (on ne fait jamais confiance à un fichier). Code pur.

import type { Json } from '../../types/json.ts';
import { estEntierEntre, estObjet, estTableauDe } from '../../utils/gardes-json.ts';
import { casesIsolees, estConnexe, grilleDe, nombreDe } from './grille.ts';
import { COTE_MAX, COTE_MIN, NOIRE, type ActionCases, type DonneesCases, type EtatCases } from './types.ts';

/** Nombre de la liste : au moins 2 chiffres, sans 0 en tête. */
const FORME_NOMBRE = /^[1-9][0-9]+$/;

export function estNombre(v: unknown): v is string {
  return typeof v === 'string' && FORME_NOMBRE.test(v);
}

const estValeurCase = (v: unknown): v is number => estEntierEntre(v, NOIRE, 9);
const estNumero = (v: unknown): v is number => estEntierEntre(v, 0, COTE_MAX * COTE_MAX);

/**
 * Données valides : dimensions, cases, au moins un emplacement, aucune case blanche isolée, cases
 * blanches d'un seul tenant, nombres tous différents et sans 0 en tête, pré-placés valides.
 * (L'unicité de la solution n'est pas revérifiée ici : trop coûteux, et garantie à la génération.)
 */
export function estDonneesCases(v: Json): v is DonneesCases {
  if (!estObjet(v)) return false;
  const { largeur, hauteur, solution, preplaces } = v;
  if (!estEntierEntre(largeur, COTE_MIN, COTE_MAX) || !estEntierEntre(hauteur, COTE_MIN, COTE_MAX)) return false;
  if (!estTableauDe(solution, estValeurCase) || solution.length !== largeur * hauteur) return false;
  if (!estTableauDe(preplaces, estNumero) || preplaces.some((n, i) => i > 0 && n <= (preplaces[i - 1] ?? -1))) return false;
  const grille = grilleDe(largeur, hauteur, solution.map((c) => c === NOIRE));
  if (grille.emplacements.length === 0 || casesIsolees(grille).length > 0 || !estConnexe(grille)) return false;
  const nombres = grille.emplacements.map((e) => nombreDe(e, solution));
  return (
    nombres.every((n) => estNombre(n)) &&
    new Set(nombres).size === nombres.length &&
    preplaces.every((id) => id < grille.emplacements.length)
  );
}

export function estEtatCases(v: Json): v is EtatCases {
  if (!estObjet(v)) return false;
  const { places } = v;
  if (!estTableauDe(places, (p): p is string | null => p === null || estNombre(p)) || places.length === 0) return false;
  const poses = places.filter((p) => p !== null);
  return new Set(poses).size === poses.length;
}

export function estActionCases(v: Json): v is ActionCases {
  if (!estObjet(v) || !estNumero(v['emplacement'])) return false;
  if (v['type'] === 'effacer') return true;
  return v['type'] === 'placer' && estNombre(v['nombre']);
}
