// Web Worker de calcul : génère les grilles en arrière-plan pour ne jamais figer l'interface.
// Compilé avec les seuls types WebWorker (voir src/worker/tsconfig.json).
//
// Le worker ne connaît pas le registre (qui dépend du DOM) : il charge la logique
// d'un jeu par convention, depuis ../games/<id>/logique.js.

import type { LogiqueJeu } from '../types/jeu.ts';
import type { Json } from '../types/json.ts';
import { estNiveau } from '../types/niveaux.ts';
import type { DemandeWorker, ReponseWorker } from '../types/worker.ts';
import { creerAlea } from '../utils/alea.ts';
import { estEntierEntre, estObjet } from '../utils/gardes-json.ts';

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

/** Vérifie la forme d'un message reçu avant de l'utiliser. */
function estDemande(valeur: unknown): valeur is DemandeWorker {
  if (!estObjet(valeur)) return false;
  if (valeur['type'] === 'ping') return true;
  return (
    valeur['type'] === 'generer' &&
    estEntierEntre(valeur['requete'], 0, Number.MAX_SAFE_INTEGER) &&
    typeof valeur['jeu'] === 'string' &&
    estNiveau(valeur['niveau']) &&
    estEntierEntre(valeur['graine'], 0, 4294967295) &&
    estEntierEntre(valeur['tentativesMax'], 1, 1_000_000)
  );
}

async function traiter(demande: DemandeWorker): Promise<void> {
  switch (demande.type) {
    case 'ping':
      repondre({ type: 'pret' });
      return;
    case 'generer': {
      try {
        const logique = await chargerLogique(demande.jeu);
        const resultat = logique.generer(demande.niveau, creerAlea(demande.graine), {
          tentativesMax: demande.tentativesMax,
        });
        if (resultat.ok) {
          const puzzle = {
            jeu: demande.jeu,
            graine: demande.graine,
            notation: resultat.notation,
            donnees: resultat.donnees,
          };
          repondre({ type: 'genere', requete: demande.requete, puzzle });
        } else {
          repondre({ type: 'echec', requete: demande.requete, raison: resultat.raison });
        }
      } catch (erreur) {
        const message = erreur instanceof Error ? erreur.message : String(erreur);
        repondre({ type: 'erreur', requete: demande.requete, message });
      }
      return;
    }
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
