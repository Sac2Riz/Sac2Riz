// SERVICE DES PARTIES : partie en cours de chaque jeu (magasin « parties ») et statistiques
// (magasin « stats »). Une seule partie en cours par jeu.
//
// - sauvegarder : appelé après chaque action (et quand l'appli passe en arrière-plan) ;
// - abandonner : la partie en cours est remplacée par une nouvelle (le joueur a confirmé) :
//   elle compte comme abandonnée dans les statistiques, puis elle est supprimée ;
// - terminer : grille finie : statistiques mises à jour, partie supprimée.
// Les écritures sont mises en série (une à la fois, dans l'ordre d'appel) : une sauvegarde
// lancée avant la fin de partie ne peut pas réécrire la partie après sa suppression.

import type { Force, Niveau } from '../types/niveaux.ts';
import type { PartieSauvegardee, StatsJeu } from '../types/sauvegarde.ts';
import { enregistrerAbandon, enregistrerTerminee, statsVides } from './stats.ts';
import type { Stockage } from './stockage/stockage.ts';

export interface ServiceParties {
  lire(jeu: string): Promise<PartieSauvegardee | null>;
  sauvegarder(partie: PartieSauvegardee): Promise<void>;
  /** Compte la partie en cours de ce jeu comme abandonnée et la supprime (rien s'il n'y en a pas). */
  abandonner(jeu: string): Promise<void>;
  /** Enregistre une partie terminée dans les statistiques et supprime la partie en cours. */
  terminer(jeu: string, niveau: Niveau, tempsMs: number, force: Force): Promise<void>;
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
    terminer: (jeu, niveau, tempsMs, force) =>
      enSerie(async () => {
        await stockage.ecrire('stats', jeu, enregistrerTerminee(await lireStats(jeu), niveau, tempsMs, force));
        await stockage.supprimer('parties', jeu);
      }),
    oublier: (jeu) => enSerie(() => stockage.supprimer('parties', jeu)),
    stats: (jeu) => enSerie(() => lireStats(jeu)),
  };
}
