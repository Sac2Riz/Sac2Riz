// Protocole des messages échangés entre la page et le Web Worker de calcul.
// Le worker exécute les calculs lourds (génération, notation) sans figer l'interface.

import type { Puzzle, ValeursReglagesJeu } from './jeu.ts';
import type { Json } from './json.ts';
import type { Niveau } from './niveaux.ts';

/** Messages envoyés par la page au worker. */
export type DemandeWorker =
  | { readonly type: 'ping' }
  | {
      readonly type: 'generer';
      /** Numéro choisi par la page pour retrouver la réponse correspondante. */
      readonly requete: number;
      readonly jeu: string;
      readonly niveau: Niveau;
      readonly graine: number;
      /** Budget de temps en millisecondes : au-delà, le worker abandonne et répond « echec ». */
      readonly budgetMs: number;
    }
  | {
      /**
       * Prépare une grille pour une NOUVELLE partie (LogiqueJeu.preparer : aide au départ…),
       * selon les réglages du jeu (options).
       * Réponse : « genere » avec le puzzle préparé (mêmes jeu, graine et notation).
       */
      readonly type: 'preparer';
      readonly requete: number;
      readonly jeu: string;
      readonly puzzle: Puzzle<Json>;
      readonly options: ValeursReglagesJeu;
    };

/** Messages renvoyés par le worker à la page. */
export type ReponseWorker =
  | { readonly type: 'pret' }
  | { readonly type: 'genere'; readonly requete: number; readonly puzzle: Puzzle<Json> }
  /** Génération abandonnée (budget de temps épuisé) : la page relance plus tard ou se rabat sur un pack. */
  | { readonly type: 'echec'; readonly requete: number; readonly raison: string }
  | { readonly type: 'erreur'; readonly requete: number | null; readonly message: string };

/** Demande de génération seule (utile au client et au traitement dans le worker). */
export type DemandeGeneration = Extract<DemandeWorker, { readonly type: 'generer' }>;

/** Demande de préparation seule. */
export type DemandePreparation = Extract<DemandeWorker, { readonly type: 'preparer' }>;

/** Budget de temps maximal accepté par le worker pour une demande (garde-fou). */
export const BUDGET_MAX_MS = 600_000;
