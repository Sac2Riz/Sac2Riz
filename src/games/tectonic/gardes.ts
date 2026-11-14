// GARDES de type du Tectonic : validation stricte des données, états et actions relus dans une
// sauvegarde ou un fichier importé. Code pur.

import type { Json } from '../../types/json.ts';
import { estEntierEntre, estObjet, estTableauDe } from '../../utils/gardes-json.ts';
import { casesAutour, cellulesDesZones, estNumerotee, zonesConnexes } from './geometrie.ts';
import {
  COTE_MAX,
  COTE_MIN,
  TAILLE_ZONE_MAX,
  type ActionTectonic,
  type DonneesTectonic,
  type EtatTectonic,
  type NotesCase,
} from './types.ts';

const CASES_MAX = COTE_MAX * COTE_MAX;
const estChiffre = (v: unknown): v is number => estEntierEntre(v, 1, TAILLE_ZONE_MAX);
const estChiffreOuVide = (v: unknown): v is number => estEntierEntre(v, 0, TAILLE_ZONE_MAX);
const estCellule = (v: unknown): v is number => estEntierEntre(v, 0, CASES_MAX - 1);

/**
 * Vrai si la solution respecte les règles : chaque zone de N cases contient 1 à N (une fois chacun),
 * et deux cases qui se touchent ont des chiffres différents.
 */
export function respecteLesRegles(
  lignes: number,
  colonnes: number,
  zones: readonly number[],
  solution: readonly number[],
): boolean {
  const zonesOk = cellulesDesZones(zones).every((cellules) => {
    const chiffres = new Set(cellules.map((c) => solution[c] ?? 0));
    return chiffres.size === cellules.length && [...chiffres].every((v) => v >= 1 && v <= cellules.length);
  });
  return zonesOk && solution.every((v, c) => casesAutour(lignes, colonnes, c).every((a) => solution[a] !== v));
}

/** Carte des zones valide : numérotée dans l'ordre de lecture, zones d'un seul tenant, taille ≤ TAILLE_ZONE_MAX. */
function estCarte(lignes: number, colonnes: number, zones: readonly number[]): boolean {
  return (
    estNumerotee(zones) &&
    zonesConnexes(lignes, colonnes, zones) &&
    cellulesDesZones(zones).every((cellules) => cellules.length <= TAILLE_ZONE_MAX)
  );
}

export function estDonnees(v: Json): v is DonneesTectonic {
  if (!estObjet(v)) return false;
  const { lignes, colonnes, zones, enonce, solution } = v;
  if (!estEntierEntre(lignes, COTE_MIN, COTE_MAX) || !estEntierEntre(colonnes, COTE_MIN, COTE_MAX)) return false;
  const nombre = lignes * colonnes;
  const estCarteDeTaille = (t: unknown): t is readonly number[] =>
    estTableauDe(t, (z): z is number => estEntierEntre(z, 0, nombre - 1)) && t.length === nombre;
  return (
    estCarteDeTaille(zones) &&
    estTableauDe(enonce, estChiffreOuVide) &&
    enonce.length === nombre &&
    estTableauDe(solution, estChiffre) &&
    solution.length === nombre &&
    estCarte(lignes, colonnes, zones) &&
    enonce.every((c, i) => c === 0 || c === solution[i]) &&
    respecteLesRegles(lignes, colonnes, zones, solution)
  );
}

/** Notes d'une case : chiffres strictement croissants (donc sans doublon). */
function estNotes(v: unknown): v is readonly number[] {
  return estTableauDe(v, estChiffre) && v.every((n, i) => i === 0 || n > (v[i - 1] ?? 0));
}

export function estEtat(v: Json): v is EtatTectonic {
  if (!estObjet(v)) return false;
  const { valeurs, notes } = v;
  return (
    estTableauDe(valeurs, estChiffreOuVide) &&
    valeurs.length >= COTE_MIN * COTE_MIN &&
    valeurs.length <= CASES_MAX &&
    estTableauDe(notes, estNotes) &&
    notes.length === valeurs.length &&
    notes.every((n, i) => n.length === 0 || valeurs[i] === 0)
  );
}

function estNotesCase(v: unknown): v is NotesCase {
  return estObjet(v) && estCellule(v['cellule']) && estNotes(v['notes']);
}

/** Changements de notes : au moins un, chaque case au plus une fois. */
function estChangements(v: unknown): v is readonly NotesCase[] {
  return estTableauDe(v, estNotesCase) && v.length > 0 && new Set(v.map((c) => c.cellule)).size === v.length;
}

export function estAction(v: Json): v is ActionTectonic {
  if (!estObjet(v)) return false;
  if (v['type'] === 'definir-notes') return estChangements(v['changements']);
  if (!estCellule(v['cellule'])) return false;
  if (v['type'] === 'effacer') return true;
  return (v['type'] === 'placer' || v['type'] === 'placer-seul' || v['type'] === 'noter') && estChiffre(v['valeur']);
}
