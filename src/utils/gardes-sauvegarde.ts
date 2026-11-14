// Gardes de type des données conservées (IndexedDB, export) et des grilles reçues du worker.
// On ne fait jamais confiance à une donnée relue : une entrée invalide est ignorée. Code pur.
// Les données propres à chaque jeu (puzzle.donnees, actions) ne sont vérifiées ici que comme
// du JSON ; le module du jeu les contrôle ensuite avec ses gardes estDonnees / estAction.

import type { Puzzle } from '../types/jeu.ts';
import type { Json } from '../types/json.ts';
import { estForce, estNiveau, NIVEAUX, type Notation } from '../types/niveaux.ts';
import type {
  EntreeReserve,
  EtatPack,
  PartieSauvegardee,
  Reglages,
  ReglagesBruts,
  ReglagesEnregistres,
  ReglagesV1,
  StatsJeu,
  StatsNiveau,
  Theme,
} from '../types/sauvegarde.ts';
import { estEntierEntre, estJson, estNombreEntre, estObjet, estTableauDe } from './gardes-json.ts';

const MAX = Number.MAX_SAFE_INTEGER;

/** Texte de date ISO 8601 lisible par Date. */
export function estDateIso(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && valeur.length > 0 && !Number.isNaN(Date.parse(valeur));
}

/** Notation générique (tous jeux) : les détails sont des compteurs entiers. */
export function estNotation(valeur: unknown): valeur is Notation {
  if (!estObjet(valeur)) return false;
  const { niveau, force, techniqueMax, details } = valeur;
  return (
    estNiveau(niveau) &&
    estForce(force) &&
    typeof techniqueMax === 'string' &&
    estObjet(details) &&
    Object.values(details).every((n) => estEntierEntre(n, 0, MAX))
  );
}

export function estPuzzle(valeur: unknown): valeur is Puzzle<Json> {
  if (!estObjet(valeur)) return false;
  const { jeu, graine, notation, donnees } = valeur;
  return (
    typeof jeu === 'string' &&
    jeu.length > 0 &&
    estEntierEntre(graine, 0, 4294967295) &&
    estNotation(notation) &&
    estJson(donnees)
  );
}

export function estPartieSauvegardee(valeur: unknown): valeur is PartieSauvegardee {
  if (!estObjet(valeur)) return false;
  const { jeu, versionFormat, puzzle, actions, curseur, chronoMs, indicesUtilises, debut, maj } = valeur;
  return (
    typeof jeu === 'string' &&
    estEntierEntre(versionFormat, 1, MAX) &&
    estPuzzle(puzzle) &&
    puzzle.jeu === jeu &&
    estTableauDe(actions, estJson) &&
    estEntierEntre(curseur, 0, actions.length) &&
    estNombreEntre(chronoMs, 0, MAX) &&
    estEntierEntre(indicesUtilises, 0, MAX) &&
    estDateIso(debut) &&
    estDateIso(maj)
  );
}

export function estStatsNiveau(valeur: unknown): valeur is StatsNiveau {
  if (!estObjet(valeur)) return false;
  const { terminees, abandonnees, meilleurTempsMs, totalTempsMs, totalForce } = valeur;
  return (
    estEntierEntre(terminees, 0, MAX) &&
    estEntierEntre(abandonnees, 0, MAX) &&
    (meilleurTempsMs === null || estNombreEntre(meilleurTempsMs, 0, MAX)) &&
    estNombreEntre(totalTempsMs, 0, MAX) &&
    estEntierEntre(totalForce, 0, MAX)
  );
}

/** Statistiques d'un jeu : exactement les 6 niveaux, ni plus ni moins. */
export function estStatsJeu(valeur: unknown): valeur is StatsJeu {
  if (!estObjet(valeur)) return false;
  return Object.keys(valeur).length === NIVEAUX.length && NIVEAUX.every((niveau) => estStatsNiveau(valeur[niveau]));
}

const THEMES: readonly Theme[] = ['systeme', 'clair', 'sombre'];

/** Réglages de l'étape 3b (thème et vérification des erreurs seulement). */
export function estReglagesV1(valeur: unknown): valeur is ReglagesV1 {
  if (!estObjet(valeur)) return false;
  const { theme, verifierErreurs } = valeur;
  // « as » sans risque : élargit le tableau (lecture seule) pour pouvoir y chercher un texte quelconque
  return (
    typeof theme === 'string' && (THEMES as readonly string[]).includes(theme) && typeof verifierErreurs === 'boolean'
  );
}

/** Objet dont chaque valeur passe la garde (clés quelconques). */
function estDictionnaireDe<T>(valeur: unknown, garde: (v: unknown) => v is T): valeur is { readonly [cle: string]: T } {
  return estObjet(valeur) && Object.values(valeur).every(garde);
}

const estObjetJson = (v: unknown): v is { readonly [id: string]: Json } => estObjet(v) && estJson(v);
const estBooleen = (v: unknown): v is boolean => typeof v === 'boolean';
const estValeursJeu = (v: unknown): v is { readonly [id: string]: boolean } => estDictionnaireDe(v, estBooleen);

/** Partie commune aux réglages actuels : thème, réglages de tous les jeux. */
function estSocleReglages(valeur: unknown): boolean {
  return estObjet(valeur) && typeof valeur['miseEnEvidence'] === 'boolean' && estReglagesV1(valeur);
}

/** Réglages actuels, valeurs des jeux vérifiées (export, import d'un fichier n° 2). */
export function estReglages(valeur: unknown): valeur is Reglages {
  return estSocleReglages(valeur) && estObjet(valeur) && estDictionnaireDe(valeur['jeux'], estValeursJeu);
}

/** Réglages actuels dont les valeurs des jeux restent à trier (normaliserReglages, socle/reglages.ts). */
export function estReglagesBruts(valeur: unknown): valeur is ReglagesBruts {
  return estSocleReglages(valeur) && estObjet(valeur) && estDictionnaireDe(valeur['jeux'], estObjetJson);
}

/**
 * Contenu acceptable du magasin « reglages » : forme actuelle (ReglagesBruts), ou une ancienne
 * forme « à plat » (V1 à V3, reconnues par leur partie commune ; converties à la lecture).
 */
export function estReglagesEnregistres(valeur: unknown): valeur is ReglagesEnregistres {
  if (estObjet(valeur) && 'jeux' in valeur) return estReglagesBruts(valeur);
  return estReglagesV1(valeur);
}

/** Entrée de la réserve : le puzzle doit être du jeu et du niveau annoncés. */
export function estEntreeReserve(valeur: unknown): valeur is EntreeReserve {
  if (!estObjet(valeur)) return false;
  const { jeu, niveau, ajouteLe, puzzle } = valeur;
  return (
    typeof jeu === 'string' &&
    estNiveau(niveau) &&
    estDateIso(ajouteLe) &&
    estPuzzle(puzzle) &&
    puzzle.jeu === jeu &&
    puzzle.notation.niveau === niveau
  );
}

/** Vrai si le tableau contient exactement une fois chaque entier de 0 à taille − 1. */
function estPermutation(valeur: readonly Json[], taille: number): boolean {
  return (
    valeur.length === taille &&
    new Set(valeur).size === taille &&
    valeur.every((i) => estEntierEntre(i, 0, taille - 1))
  );
}

export function estEtatPack(valeur: unknown): valeur is EtatPack {
  if (!estObjet(valeur)) return false;
  const { taille, ordre, position, derniere, cycle } = valeur;
  return (
    estEntierEntre(taille, 1, MAX) &&
    Array.isArray(ordre) &&
    estPermutation(ordre, taille) &&
    estEntierEntre(position, 0, taille) &&
    (derniere === null || estEntierEntre(derniere, 0, taille - 1)) &&
    estEntierEntre(cycle, 1, MAX)
  );
}
