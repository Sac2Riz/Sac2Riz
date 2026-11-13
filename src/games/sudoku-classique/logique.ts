// LOGIQUE du sudoku classique : implémente LogiqueJeu (src/types/jeu.ts).
// Code PUR : aucun accès au DOM, aucune mutation. Le worker charge l'export « logique ».
// Génération, notation et indices (indice.ts) s'appuient sur le moteur (src/moteur/).

import type { Alea } from '../../types/alea.ts';
import type { LogiqueJeu, OptionsGeneration, ResultatGeneration } from '../../types/jeu.ts';
import type { Json } from '../../types/json.ts';
import type { Niveau, Notation } from '../../types/niveaux.ts';
import { genererParNiveau } from '../../moteur/generation-niveau.ts';
import { noterGrille } from '../../moteur/notation.ts';
import { estSolution } from '../../moteur/validation.ts';
import { estEntierEntre, estObjet, estTableauDe } from '../../utils/gardes-json.ts';
import { CONTEXTE, DEFINITION } from './definition.ts';
import { VOISINES } from './geometrie.ts';
import { cellulesFausses, indice, nomTechnique } from './indice.ts';
import { META } from './meta.ts';
import {
  NOMBRE_CASES,
  TAILLE,
  type ActionSudoku,
  type DonneesSudoku,
  type EtatSudoku,
  type NotesCase,
} from './types.ts';

// ---------- Génération et notation ----------

function generer(niveau: Niveau, alea: Alea, options: OptionsGeneration): ResultatGeneration<DonneesSudoku> {
  const resultat = genererParNiveau(DEFINITION, niveau, alea, { doitArreter: options.doitArreter });
  if (!resultat.ok) return { ok: false, raison: resultat.raison };
  return { ok: true, donnees: { enonce: resultat.enonce, solution: resultat.solution }, notation: resultat.notation };
}

function noter(donnees: DonneesSudoku): Notation | null {
  return noterGrille(CONTEXTE, donnees.enonce);
}

// ---------- Déroulement de la partie ----------

function etatInitial(donnees: DonneesSudoku): EtatSudoku {
  return { valeurs: [...donnees.enonce], notes: donnees.enonce.map(() => []) };
}

/** Copie d'un tableau avec un élément remplacé (évite toute mutation). */
function remplacer<T>(tableau: readonly T[], indice: number, valeur: T): T[] {
  return tableau.map((v, i) => (i === indice ? valeur : v));
}

/**
 * Pose un chiffre : la case perd ses notes ; avec retrait automatique, ses voisines perdent
 * aussi la note de ce chiffre.
 */
function placer(etat: EtatSudoku, cellule: number, valeur: number, retrait: boolean): EtatSudoku {
  if (etat.valeurs[cellule] === valeur) return etat;
  const voisines = new Set(retrait ? VOISINES[cellule] : []);
  const notes = etat.notes.map((n, i) => {
    if (i === cellule) return [];
    return voisines.has(i) && n.includes(valeur) ? n.filter((v) => v !== valeur) : n;
  });
  return { valeurs: remplacer(etat.valeurs, cellule, valeur), notes };
}

/** Ajoute ou retire une note (seulement dans une case vide). */
function noterCase(etat: EtatSudoku, cellule: number, valeur: number): EtatSudoku {
  if (etat.valeurs[cellule] !== 0) return etat;
  const notes = etat.notes[cellule] ?? [];
  const nouvelles = notes.includes(valeur)
    ? notes.filter((n) => n !== valeur)
    : [...notes, valeur].sort((a, b) => a - b);
  return { valeurs: etat.valeurs, notes: remplacer(etat.notes, cellule, nouvelles) };
}

function effacer(etat: EtatSudoku, cellule: number): EtatSudoku {
  if (etat.valeurs[cellule] === 0 && (etat.notes[cellule] ?? []).length === 0) return etat;
  return { valeurs: remplacer(etat.valeurs, cellule, 0), notes: remplacer(etat.notes, cellule, []) };
}

/** Remplace les notes des cases listées ; les cases remplies (ou données) sont laissées telles quelles. */
function definirNotes(etat: EtatSudoku, changements: readonly NotesCase[], donnees: DonneesSudoku): EtatSudoku {
  const nouvelles = new Map(
    changements
      .filter(({ cellule }) => donnees.enonce[cellule] === 0 && etat.valeurs[cellule] === 0)
      .map(({ cellule, notes }) => [cellule, notes]),
  );
  if (nouvelles.size === 0) return etat;
  return { valeurs: etat.valeurs, notes: etat.notes.map((n, i) => nouvelles.get(i) ?? n) };
}

/** Une action sans effet renvoie l'état reçu, tel quel (le socle ne l'enregistre alors pas). */
function appliquer(etat: EtatSudoku, action: ActionSudoku, donnees: DonneesSudoku): EtatSudoku {
  if (action.type === 'definir-notes') return definirNotes(etat, action.changements, donnees);
  // Une case donnée ne se modifie jamais
  if (donnees.enonce[action.cellule] !== 0) return etat;
  switch (action.type) {
    case 'placer':
      return placer(etat, action.cellule, action.valeur, true);
    case 'placer-seul':
      return placer(etat, action.cellule, action.valeur, false);
    case 'noter':
      return noterCase(etat, action.cellule, action.valeur);
    case 'effacer':
      return effacer(etat, action.cellule);
  }
}

function erreurs(etat: EtatSudoku, donnees: DonneesSudoku): readonly number[] {
  return cellulesFausses(etat, donnees);
}

function estTerminee(etat: EtatSudoku, donnees: DonneesSudoku): boolean {
  return etat.valeurs.every((v, i) => v === donnees.solution[i]);
}

// ---------- Gardes de type (validation des sauvegardes et imports) ----------

const estChiffreOuVide = (v: unknown): v is number => estEntierEntre(v, 0, TAILLE);
const estChiffre = (v: unknown): v is number => estEntierEntre(v, 1, TAILLE);

/** Liste de NOMBRE_CASES éléments qui passent la garde. */
function estGrilleDe<T extends Json>(v: unknown, garde: (e: unknown) => e is T): v is readonly T[] {
  return estTableauDe(v, garde) && v.length === NOMBRE_CASES;
}

/** Notes d'une case : chiffres de 1 à 9, strictement croissants (donc sans doublon). */
function estNotes(v: unknown): v is readonly number[] {
  return estTableauDe(v, estChiffre) && v.every((n, i) => i === 0 || n > (v[i - 1] ?? 0));
}

function estDonnees(v: Json): v is DonneesSudoku {
  if (!estObjet(v)) return false;
  const { enonce, solution } = v;
  return (
    estGrilleDe(enonce, estChiffreOuVide) &&
    estGrilleDe(solution, estChiffre) &&
    enonce.every((c, i) => c === 0 || c === solution[i]) &&
    estSolution(DEFINITION, solution)
  );
}

function estEtat(v: Json): v is EtatSudoku {
  if (!estObjet(v)) return false;
  const { valeurs, notes } = v;
  return (
    estGrilleDe(valeurs, estChiffreOuVide) &&
    estGrilleDe(notes, estNotes) &&
    notes.every((n, i) => n.length === 0 || valeurs[i] === 0)
  );
}

const estCellule = (v: unknown): v is number => estEntierEntre(v, 0, NOMBRE_CASES - 1);

function estNotesCase(v: unknown): v is NotesCase {
  return estObjet(v) && estCellule(v['cellule']) && estNotes(v['notes']);
}

/** Changements de notes : au moins un, chaque case au plus une fois. */
function estChangements(v: unknown): v is readonly NotesCase[] {
  return estTableauDe(v, estNotesCase) && v.length > 0 && new Set(v.map((c) => c.cellule)).size === v.length;
}

function estAction(v: Json): v is ActionSudoku {
  if (!estObjet(v)) return false;
  if (v['type'] === 'definir-notes') return estChangements(v['changements']);
  if (!estCellule(v['cellule'])) return false;
  if (v['type'] === 'effacer') return true;
  return (v['type'] === 'placer' || v['type'] === 'placer-seul' || v['type'] === 'noter') && estChiffre(v['valeur']);
}

// ---------- Export : l'objet qui respecte le contrat ----------

export const logique: LogiqueJeu<DonneesSudoku, EtatSudoku, ActionSudoku> = {
  meta: META,
  generer,
  noter,
  etatInitial,
  appliquer,
  erreurs,
  estTerminee,
  indice,
  nomTechnique,
  estDonnees,
  estEtat,
  estAction,
};
