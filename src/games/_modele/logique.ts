// LOGIQUE du jeu : implémente LogiqueJeu (src/types/jeu.ts).
// Code PUR : aucun accès au DOM (vérifié par la config du worker), aucune mutation.
// Le fichier doit exporter « logique » : le worker le charge sous ce nom.

import type { Alea } from '../../types/alea.ts';
import type { Indice, LogiqueJeu, OptionsGeneration, OptionsJeu, ResultatGeneration } from '../../types/jeu.ts';
import type { Json } from '../../types/json.ts';
import { INFOS_NIVEAUX, NIVEAUX, type Niveau, type Notation } from '../../types/niveaux.ts';
import { estEntierEntre, estObjet, estTableauDe } from '../../utils/gardes-json.ts';
import { META } from './meta.ts';
import { TAILLE, type ActionModele, type DonneesModele, type EtatModele } from './types.ts';

/** Chiffres utilisés : 1 à TAILLE. */
const CHIFFRES: readonly number[] = Array.from({ length: TAILLE }, (_, i) => i + 1);

/**
 * Critère de difficulté du modèle : le nombre de cases vides (1 à 6 → 6 niveaux).
 * Un vrai jeu utilise ses propres critères (voir docs/DIFFICULTE.md).
 */
const CASES_VIDES: Readonly<Record<Niveau, number>> = {
  debutant: 1, facile: 2, moyen: 3, difficile: 4, expert: 5, diabolique: 6,
};

// ---------- Génération et notation ----------

function noter(donnees: DonneesModele): Notation | null {
  const vides = donnees.donnes.filter((v) => v === 0).length;
  const niveau = NIVEAUX[vides - 1];
  if (niveau === undefined) return null; // grille impossible à noter → rejetée
  return {
    niveau,
    force: INFOS_NIVEAUX[niveau].forceMin,
    techniqueMax: 'modele-deduction',
    details: { casesVides: vides },
  };
}

function generer(niveau: Niveau, alea: Alea, _options: OptionsGeneration): ResultatGeneration<DonneesModele> {
  const solution = alea.melanger(CHIFFRES);
  const indices = Array.from({ length: TAILLE }, (_, i) => i);
  const vides = new Set(alea.melanger(indices).slice(0, CASES_VIDES[niveau]));
  const donnees: DonneesModele = {
    donnes: solution.map((v, i) => (vides.has(i) ? 0 : v)),
    solution,
  };
  const notation = noter(donnees);
  if (notation === null) return { ok: false, raison: 'Notation impossible' };
  return { ok: true, donnees, notation };
}

// ---------- Déroulement de la partie ----------

function etatInitial(donnees: DonneesModele): EtatModele {
  return { valeurs: [...donnees.donnes], notes: donnees.donnes.map(() => []) };
}

/** Copie d'un tableau avec un élément remplacé (évite toute mutation). */
function remplacer<T>(tableau: readonly T[], indice: number, valeur: T): T[] {
  return tableau.map((v, i) => (i === indice ? valeur : v));
}

function appliquer(etat: EtatModele, action: ActionModele, donnees: DonneesModele): EtatModele {
  // Une case donnée ne se modifie jamais : on renvoie l'état tel quel
  if (donnees.donnes[action.cellule] !== 0) return etat;
  switch (action.type) {
    case 'placer':
      return {
        valeurs: remplacer(etat.valeurs, action.cellule, action.valeur),
        notes: remplacer(etat.notes, action.cellule, []),
      };
    case 'noter': {
      const notes = etat.notes[action.cellule] ?? [];
      const nouvelles = notes.includes(action.valeur)
        ? notes.filter((n) => n !== action.valeur)
        : [...notes, action.valeur].sort((a, b) => a - b);
      return { valeurs: etat.valeurs, notes: remplacer(etat.notes, action.cellule, nouvelles) };
    }
    case 'effacer':
      return {
        valeurs: remplacer(etat.valeurs, action.cellule, 0),
        notes: remplacer(etat.notes, action.cellule, []),
      };
  }
}

function erreurs(etat: EtatModele, donnees: DonneesModele): readonly number[] {
  const fausses: number[] = [];
  etat.valeurs.forEach((v, i) => {
    if (v !== 0 && v !== donnees.solution[i]) fausses.push(i);
  });
  return fausses;
}

function estTerminee(etat: EtatModele, donnees: DonneesModele): boolean {
  return etat.valeurs.every((v, i) => v === donnees.solution[i]);
}

/**
 * Indice en deux temps : les marques (cases, candidats) sont montrées avec l'explication,
 * puis l'action est jouée si le joueur le demande. Les options (réglages du joueur) ne
 * changent rien pour ce jeu sans retrait automatique des notes.
 */
function indice(etat: EtatModele, donnees: DonneesModele, _options: OptionsJeu): Indice<ActionModele> | null {
  const cellule = etat.valeurs.findIndex((v, i) => v !== donnees.solution[i]);
  const valeur = donnees.solution[cellule];
  if (cellule < 0 || valeur === undefined) return null;
  return {
    titre: 'Déduction',
    explication: `Le seul chiffre manquant possible en case ${cellule + 1} est ${valeur}.`,
    marques: { cellules: [cellule], zones: [], candidats: [], eliminations: [], placements: [{ cellule, valeur }] },
    libelleAction: `Placer le ${valeur}`,
    action: { type: 'placer', cellule, valeur },
  };
}

/** Nom affiché d'une technique (Notation.techniqueMax). */
function nomTechnique(id: string): string {
  return id === 'modele-deduction' ? 'Déduction' : id;
}

// ---------- Gardes de type (validation des sauvegardes et imports) ----------

const estChiffreOuVide = (v: unknown): v is number => estEntierEntre(v, 0, TAILLE);
const estChiffre = (v: unknown): v is number => estEntierEntre(v, 1, TAILLE);

function estDonnees(v: Json): v is DonneesModele {
  return (
    estObjet(v) &&
    estTableauDe(v['donnes'], estChiffreOuVide) && v['donnes'].length === TAILLE &&
    estTableauDe(v['solution'], estChiffre) && v['solution'].length === TAILLE
  );
}

function estEtat(v: Json): v is EtatModele {
  const estNotes = (n: unknown): n is readonly number[] => estTableauDe(n, estChiffre);
  return (
    estObjet(v) &&
    estTableauDe(v['valeurs'], estChiffreOuVide) && v['valeurs'].length === TAILLE &&
    estTableauDe(v['notes'], estNotes) && v['notes'].length === TAILLE
  );
}

function estAction(v: Json): v is ActionModele {
  if (!estObjet(v) || !estEntierEntre(v['cellule'], 0, TAILLE - 1)) return false;
  if (v['type'] === 'effacer') return true;
  return (v['type'] === 'placer' || v['type'] === 'noter') && estChiffre(v['valeur']);
}

// ---------- Export : l'objet qui respecte le contrat ----------

export const logique: LogiqueJeu<DonneesModele, EtatModele, ActionModele> = {
  meta: META,
  generer,
  noter,
  // Aucune aide au départ pour ce jeu : données inchangées
  preparer: (donnees) => donnees,
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
