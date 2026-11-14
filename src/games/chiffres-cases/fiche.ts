// FICHE des chiffres casés : règles et grille d'exemple (aperçu quand aucune partie n'est en cours).
// Code pur. L'exemple part d'une petite grille Débutant, puis joue quelques coups conseillés par
// les indices : il reste toujours cohérent avec les règles du jeu.

import type { FicheJeu } from '../../types/jeu.ts';
import { logique } from './logique.ts';
import type { DonneesCases, EtatCases } from './types.ts';

/** Grille Débutant 7 × 7, graine 1 (−1 = case noire). */
const DONNEES: DonneesCases = {
  largeur: 7,
  hauteur: 7,
  solution: [
    9, -1, 7, 9, 8, 9, 2,
    1, 8, 2, 8, -1, 5, 9,
    7, -1, 1, -1, 7, -1, -1,
    -1, -1, 9, 1, 9, -1, -1,
    -1, -1, 1, -1, 3, -1, 2,
    4, 3, -1, 6, 5, 5, 0,
    8, 8, 2, 1, 3, -1, 8,
  ],
  preplaces: [3, 10, 11],
};

/** Départ (pré-placés), puis quelques coups conseillés. */
function etatExemple(): EtatCases {
  let etat = logique.etatInitial(DONNEES);
  for (let coup = 0; coup < 3; coup++) {
    const indice = logique.indice(etat, DONNEES, {});
    if (indice === null) break;
    etat = logique.appliquer(etat, indice.action, DONNEES);
  }
  return etat;
}

export const fiche: FicheJeu<DonneesCases, EtatCases> = {
  regles: [
    'La grille se remplit comme des mots croisés, avec des nombres à la place des mots.',
    'Chaque nombre de la liste se place une seule fois, dans un emplacement de même longueur, horizontal ou vertical.',
    'Là où deux emplacements se croisent, les deux nombres partagent le même chiffre.',
    'Il n\'y a qu\'une solution, qui se trouve par la logique, sans deviner.',
    'Pour jouer : touchez un emplacement puis un nombre de la liste, ou un nombre puis un emplacement.',
  ],
  exemple: { donnees: DONNEES, etat: etatExemple() },
};
