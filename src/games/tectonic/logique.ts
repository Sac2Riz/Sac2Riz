// LOGIQUE du Tectonic : implémente LogiqueJeu (src/types/jeu.ts).
// Code PUR : aucun accès au DOM, aucune mutation. Le worker charge l'export « logique ».
// Le jeu s'appuie sur le moteur de contraintes (src/moteur/) : zones = régions complètes, carrés 2×2
// = cases qui se touchent, domaine 1..N par case (voir grille.ts).

import type { Alea } from '../../types/alea.ts';
import type { LogiqueJeu, OptionsGeneration, ResultatGeneration } from '../../types/jeu.ts';
import type { Niveau, Notation } from '../../types/niveaux.ts';
import { estAction, estDonnees, estEtat } from './gardes.ts';
import { genererTectonic } from './generateur.ts';
import { structureDe } from './grille.ts';
import { cellulesFausses, indice } from './indice.ts';
import { META } from './meta.ts';
import { noterTectonic } from './notation.ts';
import { nomTechnique } from './techniques.ts';
import type { ActionTectonic, DonneesTectonic, EtatTectonic, NotesCase } from './types.ts';

// ---------- Génération et notation ----------

function generer(niveau: Niveau, alea: Alea, options: OptionsGeneration): ResultatGeneration<DonneesTectonic> {
  const resultat = genererTectonic(niveau, alea, { doitArreter: options.doitArreter });
  if (!resultat.ok) return { ok: false, raison: resultat.raison };
  return { ok: true, donnees: resultat.donnees, notation: resultat.notation };
}

function noter(donnees: DonneesTectonic): Notation | null {
  return noterTectonic(structureDe(donnees).contexte, donnees.enonce);
}

// ---------- Déroulement de la partie ----------

function etatInitial(donnees: DonneesTectonic): EtatTectonic {
  return { valeurs: [...donnees.enonce], notes: donnees.enonce.map(() => []) };
}

/** Copie d'un tableau avec un élément remplacé (évite toute mutation). */
function remplacer<T>(tableau: readonly T[], indice: number, valeur: T): T[] {
  return tableau.map((v, i) => (i === indice ? valeur : v));
}

/** Vrai si le chiffre est permis dans la case (1 à la taille de sa zone). */
function permis(donnees: DonneesTectonic, cellule: number, valeur: number): boolean {
  return valeur >= 1 && valeur <= (structureDe(donnees).tailleCase[cellule] ?? 0);
}

/**
 * Pose un chiffre : la case perd ses notes ; avec retrait automatique, sa zone et les cases qui la
 * touchent perdent la note de ce chiffre.
 */
function placer(etat: EtatTectonic, donnees: DonneesTectonic, cellule: number, valeur: number, retrait: boolean): EtatTectonic {
  if (etat.valeurs[cellule] === valeur || !permis(donnees, cellule, valeur)) return etat;
  const voisines = new Set(retrait ? structureDe(donnees).voisines[cellule] : []);
  const notes = etat.notes.map((n, i) => {
    if (i === cellule) return [];
    return voisines.has(i) && n.includes(valeur) ? n.filter((v) => v !== valeur) : n;
  });
  return { valeurs: remplacer(etat.valeurs, cellule, valeur), notes };
}

/** Ajoute ou retire une note (case vide, chiffre permis dans la case). */
function noterCase(etat: EtatTectonic, donnees: DonneesTectonic, cellule: number, valeur: number): EtatTectonic {
  if (etat.valeurs[cellule] !== 0 || !permis(donnees, cellule, valeur)) return etat;
  const notes = etat.notes[cellule] ?? [];
  const nouvelles = notes.includes(valeur) ? notes.filter((n) => n !== valeur) : [...notes, valeur].sort((a, b) => a - b);
  return { valeurs: etat.valeurs, notes: remplacer(etat.notes, cellule, nouvelles) };
}

function effacer(etat: EtatTectonic, cellule: number): EtatTectonic {
  if (etat.valeurs[cellule] === 0 && (etat.notes[cellule] ?? []).length === 0) return etat;
  return { valeurs: remplacer(etat.valeurs, cellule, 0), notes: remplacer(etat.notes, cellule, []) };
}

/** Remplace les notes des cases listées ; cases remplies, données ou hors grille ignorées, notes hors zone retirées. */
function definirNotes(etat: EtatTectonic, changements: readonly NotesCase[], donnees: DonneesTectonic): EtatTectonic {
  const nouvelles = new Map(
    changements
      .filter(({ cellule }) => donnees.enonce[cellule] === 0 && etat.valeurs[cellule] === 0)
      .map(({ cellule, notes }) => [cellule, notes.filter((v) => permis(donnees, cellule, v))]),
  );
  if (nouvelles.size === 0) return etat;
  return { valeurs: etat.valeurs, notes: etat.notes.map((n, i) => nouvelles.get(i) ?? n) };
}

/** Une action sans effet renvoie l'état reçu, tel quel (le socle ne l'enregistre alors pas). */
function appliquer(etat: EtatTectonic, action: ActionTectonic, donnees: DonneesTectonic): EtatTectonic {
  if (action.type === 'definir-notes') return definirNotes(etat, action.changements, donnees);
  // Case hors de la grille, ou case donnée : jamais modifiée
  if (action.cellule >= donnees.enonce.length || donnees.enonce[action.cellule] !== 0) return etat;
  switch (action.type) {
    case 'placer':
      return placer(etat, donnees, action.cellule, action.valeur, true);
    case 'placer-seul':
      return placer(etat, donnees, action.cellule, action.valeur, false);
    case 'noter':
      return noterCase(etat, donnees, action.cellule, action.valeur);
    case 'effacer':
      return effacer(etat, action.cellule);
  }
}

function erreurs(etat: EtatTectonic, donnees: DonneesTectonic): readonly number[] {
  return cellulesFausses(etat, donnees);
}

function estTerminee(etat: EtatTectonic, donnees: DonneesTectonic): boolean {
  return etat.valeurs.every((v, i) => v === donnees.solution[i]);
}

// ---------- Export : l'objet qui respecte le contrat ----------

export const logique: LogiqueJeu<DonneesTectonic, EtatTectonic, ActionTectonic> = {
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
