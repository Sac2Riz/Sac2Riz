// Propagation des singletons (nus et cachés) à partir d'une hypothèse, pour le forcing simple.
// Les tableaux de travail sont locaux (copies) : les arguments ne sont jamais modifiés.
// La propagation s'arrête d'elle-même (au pire quand la grille est remplie) : chaque tour pose
// au moins une valeur, sinon on s'arrête. Code pur.

import type { Cellule } from '../../../types/grille.ts';
import type { EtatLogique } from '../../../types/logique.ts';
import { compterBits, masqueDe, plusPetiteValeur } from '../../candidats.ts';
import { cellulesDe, type Contexte } from '../contexte.ts';

export type ResultatPropagation = {
  readonly valeurs: Int32Array;
  readonly candidats: Int32Array;
  /** Vrai si l'hypothèse mène à une impossibilité (case sans candidat, valeur sans place). */
  readonly contradiction: boolean;
};

/** Suppose « valeur en cellule », puis pose tous les singletons qui en découlent. */
export function propagerSingletons(
  ctx: Contexte,
  etat: EtatLogique,
  cellule: Cellule,
  valeur: number,
): ResultatPropagation {
  const valeurs = Int32Array.from(etat.valeurs);
  const candidats = Int32Array.from(etat.candidats);
  let contradiction = false;

  function poser(c: Cellule, v: number): void {
    valeurs[c] = v;
    candidats[c] = 0;
    const bit = masqueDe(v);
    for (const voisin of ctx.voisins[c] ?? []) {
      if ((valeurs[voisin] ?? 0) === v) contradiction = true;
      candidats[voisin] = (candidats[voisin] ?? 0) & ~bit;
    }
  }

  if (((candidats[cellule] ?? 0) & masqueDe(valeur)) === 0) {
    return { valeurs, candidats, contradiction: true };
  }
  poser(cellule, valeur);

  let progres = true;
  while (progres && !contradiction) {
    progres = false;
    // Singletons nus
    for (let c = 0; c < ctx.nombreCellules && !contradiction; c++) {
      if ((valeurs[c] ?? 0) !== 0) continue;
      const masque = candidats[c] ?? 0;
      if (masque === 0) contradiction = true;
      else if (compterBits(masque) === 1) {
        poser(c, plusPetiteValeur(masque));
        progres = true;
      }
    }
    // Singletons cachés (régions complètes)
    for (const r of ctx.regionsDistinctes) {
      if (contradiction) break;
      if (ctx.complete[r] !== 1) continue;
      let placees = 0;
      for (const c of cellulesDe(ctx, r)) placees |= valeurs[c] !== 0 ? masqueDe(valeurs[c] ?? 0) : 0;
      let reste = ctx.masqueValeurs & ~placees;
      while (reste !== 0 && !contradiction) {
        const bit = reste & -reste;
        reste ^= bit;
        let place = -1;
        let nombre = 0;
        for (const c of cellulesDe(ctx, r)) {
          if ((valeurs[c] ?? 0) === 0 && ((candidats[c] ?? 0) & bit) !== 0) {
            place = c;
            nombre++;
          }
        }
        if (nombre === 0) contradiction = true;
        else if (nombre === 1) {
          poser(place, plusPetiteValeur(bit));
          progres = true;
        }
      }
    }
  }
  return { valeurs, candidats, contradiction };
}
