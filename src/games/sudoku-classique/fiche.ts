// FICHE du sudoku classique : règles et grille d'exemple (aperçu quand aucune partie n'est en cours).
// Code pur. L'exemple part d'une grille Facile, puis joue quelques coups conseillés par les indices
// et ajoute quelques notes : il reste toujours cohérent avec les règles du jeu.

import type { FicheJeu } from '../../types/jeu.ts';
import { logique } from './logique.ts';
import type { DonneesSudoku, EtatSudoku } from './types.ts';

const chiffres = (texte: string): number[] => [...texte].map(Number);

/** Grille Facile (force 4), graine 2026. */
const DONNEES: DonneesSudoku = {
  enonce: chiffres('050100003000058024080260501905600002000907000200005309501042030720530000300001050'),
  solution: chiffres('652174893197358624483269571915683742834927165276415389561842937729536418348791256'),
};

/** Départ, puis quelques coups conseillés, puis des notes dans les premières cases vides. */
function etatExemple(): EtatSudoku {
  let etat = logique.etatInitial(DONNEES);
  for (let coup = 0; coup < 12; coup++) {
    const indice = logique.indice(etat, DONNEES, {});
    if (indice === null) break;
    etat = logique.appliquer(etat, indice.action, DONNEES);
  }
  const vides = etat.valeurs.flatMap((v, cellule) => (v === 0 ? [cellule] : [])).slice(0, 3);
  for (const cellule of vides) {
    const bonne = DONNEES.solution[cellule] ?? 1;
    for (const valeur of [bonne, (bonne % 9) + 1]) etat = logique.appliquer(etat, { type: 'noter', cellule, valeur }, DONNEES);
  }
  return etat;
}

export const fiche: FicheJeu<DonneesSudoku, EtatSudoku> = {
  regles: [
    'Remplir la grille avec les chiffres de 1 à 9.',
    'Chaque ligne, chaque colonne et chaque bloc de 3 × 3 cases contient chaque chiffre une seule fois.',
    'Les chiffres donnés au départ ne bougent pas. Il n\'y a qu\'une solution, qui se trouve par la logique, sans deviner.',
    'Les notes (bouton « Notes ») gardent la trace des chiffres encore possibles dans une case.',
  ],
  exemple: { donnees: DONNEES, etat: etatExemple() },
};
