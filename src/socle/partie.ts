// PARTIE EN COURS : historique des actions + chronomètre + état courant. Code pur et générique
// (n'importe quel jeu, via sa LogiqueJeu) : l'heure est passée en paramètre et chaque fonction
// renvoie une nouvelle partie. L'écran de partie (ecran-partie.ts) ne fait que l'afficher.
//
// - jouer : applique l'action ; une action sans effet (état identique) n'est pas enregistrée,
//   pour que « Annuler » annule toujours quelque chose de visible ;
// - annuler / rétablir : déplacent le curseur de l'historique et recalculent l'état ;
// - une partie terminée (grille juste et complète) est figée : chrono arrêté, plus d'action ;
// - compterIndice : un indice montré compte, même s'il n'est pas appliqué.
// versSauvegarde / depuisSauvegarde font le lien avec PartieSauvegardee (stockage).

import type { LogiqueJeu, Puzzle } from '../types/jeu.ts';
import type { Json } from '../types/json.ts';
import type { PartieSauvegardee } from '../types/sauvegarde.ts';
import { changerVisibilite, creerChrono, lireMs, mettreEnPause, reprendre, terminer, type Chrono } from './chrono.ts';
import {
  annuler as annulerHistorique,
  estHistoriqueValide,
  etatCourant,
  historiqueVide,
  jouer as jouerHistorique,
  peutAnnuler,
  peutRetablir,
  retablir as retablirHistorique,
  type Historique,
} from './historique.ts';

/** Logique d'un jeu quelconque, telle que le socle la manipule. */
export type Logique = LogiqueJeu<Json, Json, Json>;

export type Partie = {
  readonly puzzle: Puzzle<Json>;
  readonly historique: Historique<Json>;
  /** État obtenu en rejouant l'historique jusqu'au curseur (gardé pour ne pas le recalculer). */
  readonly etat: Json;
  readonly chrono: Chrono;
  readonly indicesUtilises: number;
  /** Date de début (ISO 8601). */
  readonly debut: string;
  readonly terminee: boolean;
};

/** Nouvelle partie sur une grille ; le chrono démarre si l'appli est visible. */
export function nouvellePartie(logique: Logique, puzzle: Puzzle<Json>, maintenant: number, dateIso: string, visible: boolean): Partie {
  return {
    puzzle,
    historique: historiqueVide(),
    etat: logique.etatInitial(puzzle.donnees),
    chrono: creerChrono(maintenant, 0, visible),
    indicesUtilises: 0,
    debut: dateIso,
    terminee: false,
  };
}

/** Vrai si les deux valeurs JSON sont identiques (comparaison du texte JSON, suffisante ici). */
function memeJson(a: Json, b: Json): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/** Joue une action du joueur. Sans effet si la partie est terminée ou si l'action ne change rien. */
export function jouer(logique: Logique, partie: Partie, action: Json, maintenant: number): Partie {
  if (partie.terminee) return partie;
  const etat = logique.appliquer(partie.etat, action, partie.puzzle.donnees);
  if (memeJson(etat, partie.etat)) return partie;
  const suivante: Partie = { ...partie, historique: jouerHistorique(partie.historique, action), etat };
  if (!logique.estTerminee(etat, partie.puzzle.donnees)) return suivante;
  return { ...suivante, terminee: true, chrono: terminer(partie.chrono, maintenant) };
}

function recalculer(logique: Logique, partie: Partie, historique: Historique<Json>): Partie {
  const donnees = partie.puzzle.donnees;
  const etat = etatCourant(historique, logique.etatInitial(donnees), (e: Json, a: Json) => logique.appliquer(e, a, donnees));
  return { ...partie, historique, etat };
}

export function peutAnnulerPartie(partie: Partie): boolean {
  return !partie.terminee && peutAnnuler(partie.historique);
}

export function peutRetablirPartie(partie: Partie): boolean {
  return !partie.terminee && peutRetablir(partie.historique);
}

export function annuler(logique: Logique, partie: Partie): Partie {
  return peutAnnulerPartie(partie) ? recalculer(logique, partie, annulerHistorique(partie.historique)) : partie;
}

export function retablir(logique: Logique, partie: Partie): Partie {
  return peutRetablirPartie(partie) ? recalculer(logique, partie, retablirHistorique(partie.historique)) : partie;
}

/** Un indice a été montré au joueur : le compteur augmente, qu'il l'applique ou non. */
export function compterIndice(partie: Partie): Partie {
  return partie.terminee ? partie : { ...partie, indicesUtilises: partie.indicesUtilises + 1 };
}

/** Pause demandée par le joueur (bouton) ou reprise. */
export function changerPause(partie: Partie, enPause: boolean, maintenant: number): Partie {
  const chrono = enPause ? mettreEnPause(partie.chrono, maintenant) : reprendre(partie.chrono, maintenant);
  return { ...partie, chrono };
}

/** Appli passée en arrière-plan (pause automatique) ou revenue au premier plan. */
export function changerVisibilitePartie(partie: Partie, visible: boolean, maintenant: number): Partie {
  return { ...partie, chrono: changerVisibilite(partie.chrono, maintenant, visible) };
}

export function tempsMs(partie: Partie, maintenant: number): number {
  return lireMs(partie.chrono, maintenant);
}

/** Forme stockée de la partie (l'état n'y est pas : il se recalcule depuis les actions). */
export function versSauvegarde(logique: Logique, partie: Partie, maintenant: number, dateIso: string): PartieSauvegardee {
  return {
    jeu: partie.puzzle.jeu,
    versionFormat: logique.meta.versionFormat,
    puzzle: partie.puzzle,
    actions: partie.historique.actions,
    curseur: partie.historique.curseur,
    chronoMs: Math.round(tempsMs(partie, maintenant)),
    indicesUtilises: partie.indicesUtilises,
    debut: partie.debut,
    maj: dateIso,
  };
}

/**
 * Reprend une partie sauvegardée, ou null si elle est inutilisable (autre jeu, autre version du
 * format, données ou actions refusées par les gardes du jeu, curseur incohérent).
 * Le chrono repart du temps sauvegardé.
 */
export function depuisSauvegarde(
  logique: Logique,
  sauvegarde: PartieSauvegardee,
  maintenant: number,
  visible: boolean,
): Partie | null {
  const { puzzle } = sauvegarde;
  if (sauvegarde.jeu !== logique.meta.id || puzzle.jeu !== logique.meta.id) return null;
  if (sauvegarde.versionFormat !== logique.meta.versionFormat) return null;
  if (!logique.estDonnees(puzzle.donnees)) return null;
  if (!sauvegarde.actions.every((a) => logique.estAction(a))) return null;
  const historique: Historique<Json> = { actions: sauvegarde.actions, curseur: sauvegarde.curseur };
  if (!estHistoriqueValide(historique)) return null;

  const base: Partie = {
    puzzle,
    historique,
    etat: logique.etatInitial(puzzle.donnees),
    chrono: creerChrono(maintenant, sauvegarde.chronoMs, visible),
    indicesUtilises: sauvegarde.indicesUtilises,
    debut: sauvegarde.debut,
    terminee: false,
  };
  const partie = recalculer(logique, base, historique);
  if (!logique.estEtat(partie.etat)) return null;
  // Partie déjà finie (sauvegardée juste avant la fin) : on la fige
  return logique.estTerminee(partie.etat, puzzle.donnees)
    ? { ...partie, terminee: true, chrono: terminer(partie.chrono, maintenant) }
    : partie;
}
