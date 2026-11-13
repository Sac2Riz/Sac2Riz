// SERVICE DES PARTIES : partie en cours de chaque jeu (magasin « parties ») et statistiques
// (magasin « stats »). Une seule partie en cours par jeu.
//
// - sauvegarder : appelé après chaque action (et quand l'appli passe en arrière-plan) ;
// - abandonner : la partie en cours est remplacée par une nouvelle (le joueur a confirmé) :
//   elle compte comme abandonnée dans les statistiques, puis elle est supprimée ;
// - terminer : grille finie : statistiques mises à jour, partie supprimée ; renvoie le record
//   battu ou non (une partie avec indices ne peut pas battre le record).
// Les écritures sont mises en série (une à la fois, dans l'ordre d'appel) : une sauvegarde
// lancée avant la fin de partie ne peut pas réécrire la partie après sa suppression.

import type { Force, Niveau } from '../types/niveaux.ts';
import type { PartieSauvegardee, StatsJeu } from '../types/sauvegarde.ts';
import { enregistrerAbandon, enregistrerTerminee, estNouveauRecord, statsVides } from './stats.ts';
import type { Stockage } from './stockage/stockage.ts';

/** Partie terminée, telle qu'enregistrée dans les statistiques. */
export type PartieTerminee = {
  readonly jeu: string;
  readonly niveau: Niveau;
  readonly tempsMs: number;
  readonly force: Force;
  readonly indicesUtilises: number;
};

/** Ce que la fin de partie apprend des statistiques. */
export type BilanRecord = {
  /** Vrai si ce temps est le nouveau meilleur temps du niveau. */
  readonly nouveauRecord: boolean;
  /** Meilleur temps avant cette partie (null s'il n'y en avait pas). */
  readonly ancienRecordMs: number | null;
};

export interface ServiceParties {
  lire(jeu: string): Promise<PartieSauvegardee | null>;
  sauvegarder(partie: PartieSauvegardee): Promise<void>;
  /** Compte la partie en cours de ce jeu comme abandonnée et la supprime (rien s'il n'y en a pas). */
  abandonner(jeu: string): Promise<void>;
  /** Enregistre une partie terminée dans les statistiques et supprime la partie en cours. */
  terminer(partie: PartieTerminee): Promise<BilanRecord>;
  /** Supprime la partie en cours sans toucher aux statistiques (partie illisible). */
  oublier(jeu: string): Promise<void>;
  stats(jeu: string): Promise<StatsJeu>;
}

export function creerServiceParties(stockage: Stockage): ServiceParties {
  let file: Promise<unknown> = Promise.resolve();

  /** Exécute les opérations d'écriture une par une (une erreur n'empêche pas les suivantes). */
  function enSerie<T>(operation: () => Promise<T>): Promise<T> {
    const resultat = file.then(operation, operation);
    file = resultat.catch(() => undefined);
    return resultat;
  }

  async function lireStats(jeu: string): Promise<StatsJeu> {
    return (await stockage.lire('stats', jeu)) ?? statsVides();
  }

  return {
    lire: (jeu) => enSerie(() => stockage.lire('parties', jeu)),
    sauvegarder: (partie) => enSerie(() => stockage.ecrire('parties', partie.jeu, partie)),
    abandonner: (jeu) =>
      enSerie(async () => {
        const partie = await stockage.lire('parties', jeu);
        if (partie === null) return;
        await stockage.ecrire('stats', jeu, enregistrerAbandon(await lireStats(jeu), partie.puzzle.notation.niveau));
        await stockage.supprimer('parties', jeu);
      }),
    terminer: ({ jeu, niveau, tempsMs, force, indicesUtilises }) =>
      enSerie(async () => {
        const avant = await lireStats(jeu);
        const bilan: BilanRecord = {
          nouveauRecord: estNouveauRecord(avant[niveau], tempsMs, indicesUtilises),
          ancienRecordMs: avant[niveau].meilleurTempsMs,
        };
        await stockage.ecrire('stats', jeu, enregistrerTerminee(avant, niveau, tempsMs, force, indicesUtilises));
        await stockage.supprimer('parties', jeu);
        return bilan;
      }),
    oublier: (jeu) => enSerie(() => stockage.supprimer('parties', jeu)),
    stats: (jeu) => enSerie(() => lireStats(jeu)),
  };
}
