// DÉFINITION de la grille 9 × 9 pour le moteur (9 lignes, 9 colonnes, 9 blocs 3 × 3) et contexte
// du solveur logique, calculés une seule fois. Code pur.

import { creerContexte } from '../../moteur/logique/contexte.ts';
import { definitionClassique } from '../../moteur/regions.ts';
import { TAILLE } from './types.ts';

export const DEFINITION = definitionClassique(TAILLE, 3, 3);
export const CONTEXTE = creerContexte(DEFINITION);
