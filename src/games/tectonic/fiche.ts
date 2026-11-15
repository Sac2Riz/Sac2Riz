// FICHE du Tectonic : règles et grille d'exemple (aperçu quand aucune partie n'est en cours).
// Code pur. L'exemple part d'une grille Débutant 6 × 6 (zones de 3, 4 et 5 cases), puis joue
// quelques coups conseillés par les indices et ajoute des notes : il reste toujours cohérent avec
// les règles du jeu.

import type { FicheJeu } from '../../types/jeu.ts';
import { logique } from './logique.ts';
import type { DonneesTectonic, EtatTectonic } from './types.ts';

const chiffres = (texte: string): number[] => [...texte].map(Number);

/** Grille Débutant (force 1), graine 2026. */
const DONNEES: DonneesTectonic = {
  lignes: 6,
  colonnes: 6,
  zones: [0, 0, 0, 1, 1, 1, 0, 2, 2, 2, 3, 3, 4, 4, 2, 2, 3, 3, 4, 4, 5, 5, 5, 3, 4, 6, 5, 5, 7, 7, 6, 6, 6, 7, 7, 7],
  enonce: chiffres('020000454240101000240003000404000020'),
  solution: chiffres('123132454241131352245213513454342123'),
};

/** Départ, puis quelques coups conseillés, puis des notes dans les premières cases vides. */
function etatExemple(): EtatTectonic {
  let etat = logique.etatInitial(DONNEES);
  for (let coup = 0; coup < 8; coup++) {
    const indice = logique.indice(etat, DONNEES, {});
    if (indice === null) break;
    etat = logique.appliquer(etat, indice.action, DONNEES);
  }
  const vides = etat.valeurs.flatMap((v, cellule) => (v === 0 ? [cellule] : [])).slice(0, 3);
  for (const cellule of vides) {
    const bonne = DONNEES.solution[cellule] ?? 1;
    const autre = bonne === 1 ? 2 : 1;
    for (const valeur of [bonne, autre]) etat = logique.appliquer(etat, { type: 'noter', cellule, valeur }, DONNEES);
  }
  return etat;
}

export const fiche: FicheJeu<DonneesTectonic, EtatTectonic> = {
  regles: [
    'La grille est découpée en zones de 1 à 5 cases, entourées d\'un trait épais.',
    'Une zone de N cases contient chaque chiffre de 1 à N une seule fois : 1, 2 et 3 dans une zone de 3 cases.',
    'Deux cases qui se touchent, même en diagonale, n\'ont jamais le même chiffre.',
    'Les chiffres donnés au départ ne bougent pas. Il n\'y a qu\'une solution, qui se trouve par la logique, sans deviner.',
    'Dans les explications des indices, deux cases se voient quand elles se touchent, même en diagonale, ou sont dans la même zone.',
    'Ce jeu est aussi appelé Suguru ou Number Blocks.',
  ],
  exemple: { donnees: DONNEES, etat: etatExemple() },
};
