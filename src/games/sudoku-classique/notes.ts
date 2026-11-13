// NOTES du sudoku classique : candidats possibles d'une case et action « Remplir les notes ».
// Code pur. Les candidats se calculent à partir des seuls chiffres posés (jamais de la solution) :
// remplir les notes ne révèle rien, et un chiffre faux posé par le joueur reste visible dans ses effets.

import { VOISINES } from './geometrie.ts';
import { TAILLE, type ActionSudoku, type EtatSudoku, type NotesCase } from './types.ts';

/** Chiffres qu'aucune case voisine ne porte encore (liste triée) ; vide pour une case remplie. */
export function candidatsCase(valeurs: readonly number[], cellule: number): number[] {
  if ((valeurs[cellule] ?? 0) !== 0) return [];
  const pris = new Set((VOISINES[cellule] ?? []).map((v) => valeurs[v] ?? 0));
  return Array.from({ length: TAILLE }, (_, i) => i + 1).filter((n) => !pris.has(n));
}

function memesNotes(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

/**
 * Action qui remplace les notes de TOUTES les cases vides par leurs candidats possibles
 * (seules les cases qui changent sont listées), ou null si toutes les notes sont déjà complètes.
 */
export function remplirNotes(etat: EtatSudoku): ActionSudoku | null {
  const changements: NotesCase[] = [];
  etat.valeurs.forEach((v, cellule) => {
    if (v !== 0) return;
    const notes = candidatsCase(etat.valeurs, cellule);
    if (!memesNotes(notes, etat.notes[cellule] ?? [])) changements.push({ cellule, notes });
  });
  return changements.length === 0 ? null : { type: 'definir-notes', changements };
}
