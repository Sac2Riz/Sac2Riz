// Types du solveur logique (famille sudoku) : états de candidats et « étapes » de résolution.
// Une étape décrit ce qu'une technique a trouvé ; elle est entièrement en JSON, ce qui
// permet de l'envoyer du worker à la page et de s'en servir pour les indices expliqués (étape 3).
// Voir docs/DIFFICULTE.md. Code pur.

import type { Cellule } from './grille.ts';
import type { Niveau } from './niveaux.ts';

/** Identifiants des techniques, dans l'ordre où le solveur les essaie (de la plus simple à la plus dure). */
export const IDS_TECHNIQUES = [
  // Débutant
  'dernier-chiffre',
  'singleton-cache-bloc',
  // Facile
  'singleton-nu',
  'singleton-cache',
  // Moyen
  'paire-nue',
  'paire-cachee',
  'pointing',
  'claiming',
  // Difficile
  'triplet-nu',
  'triplet-cache',
  'quadruplet-nu',
  'quadruplet-cache',
  'skyscraper',
  '2-string-kite',
  // Expert
  'x-wing',
  'y-wing',
  'xyz-wing',
  'swordfish',
  // Diabolique
  'x-chain',
  'xy-chain',
  'forcing-simple',
] as const;

/**
 * Techniques génériques ajoutées à l'étape 7a pour le Tectonic : elles ne font PAS partie de la liste du
 * sudoku (IDS_TECHNIQUES, dont l'ordre fixe la notation du sudoku). Chaque jeu qui s'en sert donne sa
 * propre liste ordonnée au solveur et à la notation.
 */
export const IDS_TECHNIQUES_COMPLEMENTAIRES = [
  'singleton-cache-zone',
  'voisine-commune',
  'voisine-commune-etendue',
  'paire-nue-etendue',
] as const;

export type IdTechnique = (typeof IDS_TECHNIQUES)[number] | (typeof IDS_TECHNIQUES_COMPLEMENTAIRES)[number];

/** État d'une grille en cours de résolution logique. */
export type EtatLogique = {
  /** Valeurs des cases (0 = vide). */
  readonly valeurs: readonly number[];
  /** Candidats de chaque case en masque de bits (voir types/grille.ts) ; 0 pour une case remplie. */
  readonly candidats: readonly number[];
};

/** Valeur posée dans une case. */
export type Placement = {
  readonly cellule: Cellule;
  readonly valeur: number;
};

/** Liste de candidats d'une case (valeurs en clair, triées : plus lisible que des masques dans du JSON). */
export type CandidatsCase = {
  readonly cellule: Cellule;
  readonly valeurs: readonly number[];
};

/**
 * Ce qu'une technique a trouvé. Une étape a toujours au moins un effet réel :
 * un placement dans une case vide, ou l'élimination d'un candidat encore présent.
 */
export type Etape = {
  readonly technique: IdTechnique;
  readonly niveau: Niveau;
  /** Cases du motif, à mettre en évidence. */
  readonly cellules: readonly Cellule[];
  /** Candidats qui forment le motif (ex. la paire {2, 7} d'une paire nue). */
  readonly candidatsMotif: readonly CandidatsCase[];
  /** Indices des régions concernées (dans DefinitionGrille.regions). */
  readonly regions: readonly number[];
  readonly placements: readonly Placement[];
  /** Candidats retirés, case par case. */
  readonly eliminations: readonly CandidatsCase[];
  /** Explication courte en français. */
  readonly explication: string;
};

/**
 * Issue d'une résolution logique :
 * - 'resolu' : toutes les cases sont remplies ;
 * - 'bloque' : plus aucune technique ne progresse (la grille exige de l'essai-erreur, ou a plusieurs solutions) ;
 * - 'contradiction' : la grille est incohérente (énoncé invalide).
 */
export type StatutLogique = 'resolu' | 'bloque' | 'contradiction';

export type ResultatLogique = {
  readonly statut: StatutLogique;
  /** Étapes appliquées, dans l'ordre. */
  readonly etapes: readonly Etape[];
  /** État final (grille résolue, ou état au moment du blocage). */
  readonly etat: EtatLogique;
  /** Description de la contradiction, ou null. */
  readonly raison: string | null;
};
