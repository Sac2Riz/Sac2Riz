// Web Worker de calcul : génère les grilles en arrière-plan pour ne jamais figer l'interface.
// Compilé avec les seuls types WebWorker (voir src/worker/tsconfig.json).
//
// Le worker ne connaît pas le registre (qui dépend du DOM) : il charge la logique
// d'un jeu par convention, depuis ../games/<id>/logique.js.
// Il traite une demande à la fois : un calcul en cours ne peut pas être interrompu par un
// message (le client arrête le worker et en recrée un pour annuler, voir socle/client-worker.ts).

import type { LogiqueJeu } from '../types/jeu.ts';
import type { Json } from '../types/json.ts';
import type { DemandeWorker, ReponseWorker } from '../types/worker.ts';
import { estDemande, traiterGeneration } from './traitement.ts';

/** Identifiant de jeu valide (kebab-case) : empêche de charger un chemin arbitraire. */
const ID_VALIDE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const logiquesChargees = new Map<string, LogiqueJeu<Json, Json, Json>>();

function repondre(reponse: ReponseWorker): void {
  postMessage(reponse);
}

/** Vérifie qu'un module chargé expose bien « logique » avec les fonctions du contrat. */
function estModuleLogique(module: unknown): module is { logique: LogiqueJeu<Json, Json, Json> } {
  if (typeof module !== 'object' || module === null || !('logique' in module)) return false;
  const logique: unknown = module.logique;
  return (
    typeof logique === 'object' &&
    logique !== null &&
    'generer' in logique &&
    typeof logique.generer === 'function' &&
    'noter' in logique &&
    typeof logique.noter === 'function'
  );
}

async function chargerLogique(id: string): Promise<LogiqueJeu<Json, Json, Json>> {
  const dejaChargee = logiquesChargees.get(id);
  if (dejaChargee) return dejaChargee;
  if (!ID_VALIDE.test(id)) throw new Error(`Identifiant de jeu invalide : ${id}`);
  // Chemin d'exécution (fichier compilé .js), pas un import de source : pas de réécriture .ts → .js ici
  const url = new URL(`../games/${id}/logique.js`, import.meta.url);
  const module: unknown = await import(url.href);
  if (!estModuleLogique(module)) throw new Error(`Module logique invalide pour le jeu ${id}`);
  logiquesChargees.set(id, module.logique);
  return module.logique;
}

async function traiter(demande: DemandeWorker): Promise<void> {
  switch (demande.type) {
    case 'ping':
      repondre({ type: 'pret' });
      return;
    case 'generer':
      repondre(await traiterGeneration(demande, chargerLogique, () => performance.now()));
      return;
  }
}

addEventListener('message', (evenement: MessageEvent<unknown>) => {
  const donnees = evenement.data;
  if (estDemande(donnees)) {
    void traiter(donnees);
  } else {
    repondre({ type: 'erreur', requete: null, message: 'Message non reconnu' });
  }
});
