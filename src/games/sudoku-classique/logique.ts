// LOGIQUE du sudoku classique : implémente LogiqueJeu (src/types/jeu.ts).
// Code PUR : aucun accès au DOM, aucune mutation. Le worker charge l'export « logique ».
// Génération, notation et indices s'appuient sur le moteur (src/moteur/).

import type { Alea } from '../../types/alea.ts';
import type { Indice, LogiqueJeu, OptionsGeneration, ResultatGeneration } from '../../types/jeu.ts';
import type { Json } from '../../types/json.ts';
import type { Niveau, Notation } from '../../types/niveaux.ts';
import { genererParNiveau } from '../../moteur/generation-niveau.ts';
import { creerContexte } from '../../moteur/logique/contexte.ts';
import { appliquerEtape, etatInitial as etatLogiqueInitial } from '../../moteur/logique/etat.ts';
import { prochaineEtape } from '../../moteur/logique/solveur.ts';
import { noterGrille } from '../../moteur/notation.ts';
import { definitionClassique } from '../../moteur/regions.ts';
import { estSolution } from '../../moteur/validation.ts';
import { estEntierEntre, estObjet, estTableauDe } from '../../utils/gardes-json.ts';
import { nomCase, VOISINES } from './geometrie.ts';
import { META } from './meta.ts';
import { NOMBRE_CASES, TAILLE, type ActionSudoku, type DonneesSudoku, type EtatSudoku } from './types.ts';

/** Définition de la grille (9 lignes, 9 colonnes, 9 blocs 3 × 3) et contexte du solveur, calculés une fois. */
const DEFINITION = definitionClassique(TAILLE, 3, 3);
const CONTEXTE = creerContexte(DEFINITION);

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

/** Pose un chiffre : la case perd ses notes, et ses voisines perdent la note de ce chiffre. */
function placer(etat: EtatSudoku, cellule: number, valeur: number): EtatSudoku {
  if (etat.valeurs[cellule] === valeur) return etat;
  const voisines = new Set(VOISINES[cellule]);
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

/** Une action sans effet renvoie l'état reçu, tel quel (le socle ne l'enregistre alors pas). */
function appliquer(etat: EtatSudoku, action: ActionSudoku, donnees: DonneesSudoku): EtatSudoku {
  // Une case donnée ne se modifie jamais
  if (donnees.enonce[action.cellule] !== 0) return etat;
  switch (action.type) {
    case 'placer':
      return placer(etat, action.cellule, action.valeur);
    case 'noter':
      return noterCase(etat, action.cellule, action.valeur);
    case 'effacer':
      return effacer(etat, action.cellule);
  }
}

function erreurs(etat: EtatSudoku, donnees: DonneesSudoku): readonly number[] {
  const fausses: number[] = [];
  etat.valeurs.forEach((v, i) => {
    if (v !== 0 && v !== donnees.solution[i]) fausses.push(i);
  });
  return fausses;
}

function estTerminee(etat: EtatSudoku, donnees: DonneesSudoku): boolean {
  return etat.valeurs.every((v, i) => v === donnees.solution[i]);
}

/**
 * Indice (version simple, les indices détaillés arrivent à l'étape 3c) :
 * - un chiffre faux est signalé en premier (action : l'effacer) ;
 * - sinon, le solveur logique avance depuis les chiffres posés jusqu'à sa première étape qui
 *   place un chiffre ; l'indice est ce placement, avec l'explication de la technique.
 */
function indice(etat: EtatSudoku, donnees: DonneesSudoku): Indice<ActionSudoku> | null {
  const faute = erreurs(etat, donnees)[0];
  if (faute !== undefined) {
    return {
      action: { type: 'effacer', cellule: faute },
      explication: `Le chiffre de la case ${nomCase(faute)} est faux.`,
      cellules: [faute],
    };
  }
  if (estTerminee(etat, donnees)) return null;

  let etatLogique = etatLogiqueInitial(CONTEXTE, etat.valeurs);
  for (let etape = prochaineEtape(CONTEXTE, etatLogique); etape !== null; etape = prochaineEtape(CONTEXTE, etatLogique)) {
    const placement = etape.placements[0];
    if (placement !== undefined) {
      return {
        action: { type: 'placer', cellule: placement.cellule, valeur: placement.valeur },
        explication: etape.explication,
        cellules: [...new Set([...etape.cellules, placement.cellule])],
      };
    }
    etatLogique = appliquerEtape(CONTEXTE, etatLogique, etape);
  }

  // Filet de sécurité (le solveur est bloqué) : on donne directement le chiffre d'une case vide
  const cellule = etat.valeurs.findIndex((v) => v === 0);
  const valeur = donnees.solution[cellule];
  if (cellule < 0 || valeur === undefined) return null;
  return {
    action: { type: 'placer', cellule, valeur },
    explication: `La case ${nomCase(cellule)} contient un ${valeur}.`,
    cellules: [cellule],
  };
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

function estAction(v: Json): v is ActionSudoku {
  if (!estObjet(v) || !estEntierEntre(v['cellule'], 0, NOMBRE_CASES - 1)) return false;
  if (v['type'] === 'effacer') return true;
  return (v['type'] === 'placer' || v['type'] === 'noter') && estChiffre(v['valeur']);
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
  estDonnees,
  estEtat,
  estAction,
};
