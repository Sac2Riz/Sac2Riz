// Côté page : démarrage du Web Worker de calcul et échange de messages typés.
// (L'API complète — génération à la demande, réserve de grilles — arrive à l'étape 3.)

import type { DemandeWorker, ReponseWorker } from '../types/worker.ts';

let worker: Worker | null = null;

/** Crée le worker au premier appel, puis renvoie toujours le même. */
function obtenirWorker(): Worker {
  if (worker === null) {
    // URL du fichier compilé (.js) : c'est une adresse, pas un import de source
    worker = new Worker(new URL('../worker/generation.js', import.meta.url), { type: 'module' });
  }
  return worker;
}

function envoyer(demande: DemandeWorker): void {
  obtenirWorker().postMessage(demande);
}

/** Vérifie que le worker répond ; renvoie vrai s'il est prêt. */
export function verifierWorker(delaiMs = 5000): Promise<boolean> {
  return new Promise((resoudre) => {
    const w = obtenirWorker();
    const minuterie = setTimeout(() => resoudre(false), delaiMs);
    const ecouteur = (evenement: MessageEvent<ReponseWorker>): void => {
      if (evenement.data.type === 'pret') {
        clearTimeout(minuterie);
        w.removeEventListener('message', ecouteur);
        resoudre(true);
      }
    };
    w.addEventListener('message', ecouteur);
    envoyer({ type: 'ping' });
  });
}
