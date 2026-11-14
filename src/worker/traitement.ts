// Traitement des demandes reçues par le worker, séparé de postMessage pour être testé sous Node.
// L'horloge et le chargement de la logique des jeux sont fournis par l'appelant.

import type { LogiqueJeu, Puzzle } from '../types/jeu.ts';
import type { Json } from '../types/json.ts';
import { estNiveau } from '../types/niveaux.ts';
import {
  BUDGET_MAX_MS,
  type DemandeGeneration,
  type DemandePreparation,
  type DemandeWorker,
  type ReponseWorker,
} from '../types/worker.ts';
import { creerAlea } from '../utils/alea.ts';
import { estEntierEntre, estObjet } from '../utils/gardes-json.ts';
import { estPuzzle } from '../utils/gardes-sauvegarde.ts';

/** Renvoie la logique d'un jeu à partir de son identifiant (import dynamique dans le worker). */
export type ChargeurLogique = (id: string) => Promise<LogiqueJeu<Json, Json, Json>>;

/** Vérifie la forme d'un message reçu avant de l'utiliser. */
export function estDemande(valeur: unknown): valeur is DemandeWorker {
  if (!estObjet(valeur)) return false;
  if (valeur['type'] === 'ping') return true;
  if (valeur['type'] === 'preparer') {
    const options = valeur['options'];
    return (
      estEntierEntre(valeur['requete'], 0, Number.MAX_SAFE_INTEGER) &&
      typeof valeur['jeu'] === 'string' &&
      estPuzzle(valeur['puzzle']) &&
      estObjet(options) &&
      typeof options['nombreAuDepart'] === 'boolean'
    );
  }
  return (
    valeur['type'] === 'generer' &&
    estEntierEntre(valeur['requete'], 0, Number.MAX_SAFE_INTEGER) &&
    typeof valeur['jeu'] === 'string' &&
    estNiveau(valeur['niveau']) &&
    estEntierEntre(valeur['graine'], 0, 4294967295) &&
    estEntierEntre(valeur['budgetMs'], 1, BUDGET_MAX_MS)
  );
}

/**
 * Génère une grille dans le budget de temps demandé. La fonction doitArreter transmise au jeu
 * répond vrai une fois l'échéance passée ; le jeu la consulte entre deux essais.
 */
export async function traiterGeneration(
  demande: DemandeGeneration,
  charger: ChargeurLogique,
  maintenant: () => number,
): Promise<ReponseWorker> {
  try {
    const logique = await charger(demande.jeu);
    const echeance = maintenant() + demande.budgetMs;
    const resultat = logique.generer(demande.niveau, creerAlea(demande.graine), {
      doitArreter: () => maintenant() >= echeance,
    });
    if (!resultat.ok) return { type: 'echec', requete: demande.requete, raison: resultat.raison };
    const puzzle: Puzzle<Json> = {
      jeu: demande.jeu,
      graine: demande.graine,
      notation: resultat.notation,
      donnees: resultat.donnees,
    };
    return { type: 'genere', requete: demande.requete, puzzle };
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    return { type: 'erreur', requete: demande.requete, message };
  }
}

/**
 * Prépare une grille pour une nouvelle partie (LogiqueJeu.preparer). Le puzzle reste le même (jeu,
 * graine, notation) ; seules ses données peuvent changer (ex. un nombre pré-placé ajouté).
 */
export async function traiterPreparation(demande: DemandePreparation, charger: ChargeurLogique): Promise<ReponseWorker> {
  try {
    const logique = await charger(demande.jeu);
    const { puzzle } = demande;
    if (puzzle.jeu !== demande.jeu || !logique.estDonnees(puzzle.donnees)) {
      return { type: 'erreur', requete: demande.requete, message: 'Grille à préparer invalide' };
    }
    const donnees = logique.preparer(puzzle.donnees, demande.options);
    return { type: 'genere', requete: demande.requete, puzzle: donnees === puzzle.donnees ? puzzle : { ...puzzle, donnees } };
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    return { type: 'erreur', requete: demande.requete, message };
  }
}
