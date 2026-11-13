// Protocole des messages échangés entre la page et le Web Worker de calcul.
// Le worker exécute les calculs lourds (génération, notation) sans figer l'interface.

import type { Puzzle } from './jeu.ts';
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

/** Budget de temps maximal accepté par le worker pour une demande (garde-fou). */
export const BUDGET_MAX_MS = 600_000;
