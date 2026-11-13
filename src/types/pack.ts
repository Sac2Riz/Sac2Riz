// Packs de grilles pré-générées (famille sudoku), embarqués en JSON dans src/games/<id>/packs/.
// Ils garantissent qu'une grille Expert ou Diabolique est toujours disponible immédiatement,
// même si la génération à la demande est lente (voir docs/DIFFICULTE.md). Code pur.

import type { Niveau, Notation } from './niveaux.ts';

/** Version du format des packs ; à incrémenter si la forme de PackSudoku change. */
export const VERSION_FORMAT_PACK = 1;

/** Une grille d'un pack. Grilles écrites ligne par ligne en texte : un chiffre par case, 0 = vide. */
export type GrillePack = {
  /** Graine qui l'a générée (genererParNiveau avec les options par défaut du niveau). */
  readonly graine: number;
  readonly enonce: string;
  readonly solution: string;
  readonly notation: Notation;
};

export type PackSudoku = {
  readonly version: number;
  /** VERSION_NOTATION au moment de la génération : un pack d'une autre version est refusé. */
  readonly versionNotation: number;
  /** Identifiant du jeu (dossier src/games/<jeu>/). */
  readonly jeu: string;
  readonly niveau: Niveau;
  readonly grilles: readonly GrillePack[];
};
