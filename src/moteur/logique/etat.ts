// État du solveur logique : création à partir d'un énoncé, application d'une étape,
// détection des contradictions. Fonctions pures : un nouvel état est renvoyé à chaque fois.

import type { ValeursGrille } from '../../types/grille.ts';
import type { EtatLogique, Etape } from '../../types/logique.ts';
import { masqueComplet, masqueDe, valeursDuMasque } from '../candidats.ts';
import { cellulesDe, type Contexte } from './contexte.ts';
import { majuscule, nomCellule, nomRegion } from './noms.ts';

/**
 * État de départ : chaque case vide reçoit les valeurs de son domaine qui ne sont pas déjà placées
 * dans une case qu'elle voit. Les sommes des cages ne sont pas prises en compte.
 */
export function etatInitial(ctx: Contexte, valeurs: ValeursGrille): EtatLogique {
  if (valeurs.length !== ctx.nombreCellules) {
    throw new Error(`Grille de ${valeurs.length} cases au lieu de ${ctx.nombreCellules}`);
  }
  const candidats = valeurs.map((v, c) => {
    if (v !== 0) return 0;
    let masque = ctx.domaine[c] ?? 0;
    for (const voisin of ctx.voisins[c] ?? []) {
      const w = valeurs[voisin] ?? 0;
      if (w !== 0) masque &= ~masqueDe(w);
    }
    return masque;
  });
  return { valeurs: [...valeurs], candidats };
}

/**
 * Applique une étape : retire les candidats éliminés, puis pose les valeurs placées
 * (une valeur posée disparaît des candidats de toutes les cases qui voient sa case).
 */
export function appliquerEtape(ctx: Contexte, etat: EtatLogique, etape: Etape): EtatLogique {
  const valeurs = [...etat.valeurs];
  const candidats = [...etat.candidats];
  for (const { cellule, valeurs: retirees } of etape.eliminations) {
    candidats[cellule] = (candidats[cellule] ?? 0) & ~masqueComplet(retirees);
  }
  for (const { cellule, valeur } of etape.placements) {
    valeurs[cellule] = valeur;
    candidats[cellule] = 0;
    const bit = masqueDe(valeur);
    for (const voisin of ctx.voisins[cellule] ?? []) candidats[voisin] = (candidats[voisin] ?? 0) & ~bit;
  }
  return { valeurs, candidats };
}

/** Vrai si l'étape change réellement l'état (placement dans une case vide, ou candidat encore présent retiré). */
export function aDesEffets(etat: EtatLogique, etape: Etape): boolean {
  return (
    etape.placements.some(({ cellule }) => (etat.valeurs[cellule] ?? 0) === 0) ||
    etape.eliminations.some(
      ({ cellule, valeurs }) => ((etat.candidats[cellule] ?? 0) & masqueComplet(valeurs)) !== 0,
    )
  );
}

/** Vrai si toutes les cases sont remplies. */
export function estRemplie(etat: EtatLogique): boolean {
  return etat.valeurs.every((v) => v !== 0);
}

/**
 * Description de la première contradiction trouvée, ou null si l'état est cohérent :
 * case vide sans candidat, valeur répétée dans une région distincte, ou valeur
 * qui n'a plus aucune place possible dans une région complète.
 */
export function contradiction(ctx: Contexte, etat: EtatLogique): string | null {
  for (let c = 0; c < ctx.nombreCellules; c++) {
    if ((etat.valeurs[c] ?? 0) === 0 && (etat.candidats[c] ?? 0) === 0) {
      return `La case ${nomCellule(ctx, c)} n'a plus aucun candidat.`;
    }
  }
  for (const r of ctx.regionsDistinctes) {
    let placees = 0;
    let possibles = 0;
    for (const c of cellulesDe(ctx, r)) {
      const v = etat.valeurs[c] ?? 0;
      if (v === 0) {
        possibles |= etat.candidats[c] ?? 0;
        continue;
      }
      if ((placees & masqueDe(v)) !== 0) return `Le ${v} apparaît deux fois dans ${nomRegion(ctx, r)}.`;
      placees |= masqueDe(v);
    }
    if (ctx.complete[r] !== 1) continue;
    const sansPlace = (ctx.valeursRegion[r] ?? 0) & ~placees & ~possibles;
    if (sansPlace !== 0) {
      const v = valeursDuMasque(sansPlace)[0] ?? 0;
      return `${majuscule(nomRegion(ctx, r))} n'a plus de place pour le ${v}.`;
    }
  }
  return null;
}
