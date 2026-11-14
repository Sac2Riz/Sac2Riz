// FICHE du jeu : règles expliquées simplement et grille d'exemple, affichées par le socle sur la
// fiche du jeu (avec meta.nom et meta.description). Code pur.
// La grille d'exemple sert d'aperçu quand aucune partie n'est en cours : en partie remplie, et
// valide (les tests la passent aux gardes estDonnees / estEtat du jeu).

import type { FicheJeu } from '../../types/jeu.ts';
import { logique } from './logique.ts';
import type { DonneesModele, EtatModele } from './types.ts';

const DONNEES: DonneesModele = { donnes: [3, 0, 1, 0, 6, 0], solution: [3, 5, 1, 2, 6, 4] };

export const fiche: FicheJeu<DonneesModele, EtatModele> = {
  regles: [
    'Compléter la ligne avec les chiffres de 1 à 6.',
    'Chaque chiffre apparaît une seule fois.',
  ],
  // Un coup déjà joué : le 5 dans la deuxième case
  exemple: { donnees: DONNEES, etat: logique.appliquer(logique.etatInitial(DONNEES), { type: 'placer', cellule: 1, valeur: 5 }, DONNEES) },
};
