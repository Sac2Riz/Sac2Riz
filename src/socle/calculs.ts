// Côté page : création du vrai Web Worker de calcul, branché sur le client (client-worker.ts).
// Seul fichier qui appelle « new Worker » : le client, lui, reste testable sous Node.

import type { DemandeWorker } from '../types/worker.ts';
import { creerClientWorker, type ClientWorker, type FabriqueCanal } from './client-worker.ts';

/** Crée un worker module ; ses messages et ses plantages sont transmis aux récepteurs. */
export const fabriqueCanalNavigateur: FabriqueCanal = (recepteurs) => {
  // URL du fichier compilé (.js) : c'est une adresse, pas un import de source
  const worker = new Worker(new URL('../worker/generation.js', import.meta.url), { type: 'module' });
  worker.addEventListener('message', (evenement: MessageEvent<unknown>) => recepteurs.message(evenement.data));
  worker.addEventListener('error', (evenement) => {
    evenement.preventDefault(); // l'erreur est traitée : pas de message rouge en double dans la console
    recepteurs.erreur(evenement.message || 'erreur inconnue');
  });
  worker.addEventListener('messageerror', () => recepteurs.erreur('message illisible'));
  return {
    envoyer: (demande: DemandeWorker) => worker.postMessage(demande),
    arreter: () => worker.terminate(),
  };
};

/** Client du worker pour l'appli (minuteur réel, graines imprévisibles, budget par défaut). */
export function creerClientNavigateur(): ClientWorker {
  return creerClientWorker({ fabrique: fabriqueCanalNavigateur });
}
