// CLIENT DU WORKER : envoie les demandes de génération (et de préparation d'une grille pour une
// nouvelle partie) au Web Worker et rend les réponses sous forme de promesses typées.
//
// - File d'attente à deux priorités : « urgent » (le joueur attend) passe avant « fond »
//   (réalimentation de la réserve). Le worker ne calcule qu'une grille à la fois : le client ne
//   lui envoie donc qu'une demande à la fois.
// - Annulation : une demande encore dans la file en est simplement retirée. Une demande en cours
//   de calcul ne peut pas être interrompue par un message (le worker est occupé) : on ARRÊTE le
//   worker et un nouveau sera créé pour la demande suivante.
// - Budget : chaque demande peut avoir le sien (ex. génération de fond plus longue, voir
//   GenerationNiveau dans types/jeu.ts) ; sinon le budget par défaut du client.
// - Garde-fou : si le worker ne répond pas dans le budget + une marge, il est arrêté de même.
// - La promesse renvoyée n'échoue jamais : le résultat dit ce qui s'est passé (ok, echec, erreur, annule).
//
// Le vrai Worker est créé par une « fabrique » fournie à la création (calculs.ts dans le
// navigateur, un faux worker dans les tests).

import type { OptionsDepart, Puzzle } from '../types/jeu.ts';
import type { Json } from '../types/json.ts';
import type { Niveau } from '../types/niveaux.ts';
import { BUDGET_MAX_MS, type DemandeWorker, type ReponseWorker } from '../types/worker.ts';
import { graineAleatoire } from '../utils/alea.ts';
import { estEntierEntre, estObjet } from '../utils/gardes-json.ts';
import { estPuzzle } from '../utils/gardes-sauvegarde.ts';
import { programmerReel, type Annulation, type Programmer } from './environnement.ts';

/** Ce que le client attend d'un worker : envoyer un message, l'arrêter. */
export interface CanalWorker {
  envoyer(demande: DemandeWorker): void;
  arreter(): void;
}

/** Fonctions que le canal appelle quand le worker répond ou plante. */
export type Recepteurs = {
  readonly message: (donnees: unknown) => void;
  readonly erreur: (message: string) => void;
};

/** Crée un nouveau worker relié aux récepteurs fournis. */
export type FabriqueCanal = (recepteurs: Recepteurs) => CanalWorker;

export type Priorite = 'urgent' | 'fond';

export type ResultatDemande =
  | { readonly statut: 'ok'; readonly puzzle: Puzzle<Json> }
  /** Budget de temps épuisé sans grille du niveau voulu. */
  | { readonly statut: 'echec'; readonly raison: string }
  /** Problème technique : jeu introuvable, worker planté ou muet, réponse invalide. */
  | { readonly statut: 'erreur'; readonly message: string }
  | { readonly statut: 'annule' };

export type DemandeEnCours = {
  readonly resultat: Promise<ResultatDemande>;
  /** Sans effet si la demande est déjà terminée. */
  readonly annuler: () => void;
};

export interface ClientWorker {
  /** budgetMs : budget de cette demande (null = budget par défaut du client). */
  generer(jeu: string, niveau: Niveau, priorite: Priorite, budgetMs: number | null): DemandeEnCours;
  /**
   * Prépare une grille pour une nouvelle partie (LogiqueJeu.preparer), en priorité urgente, avec le
   * budget par défaut comme garde-fou. Résultat « ok » : le puzzle préparé.
   */
  preparer(puzzle: Puzzle<Json>, options: OptionsDepart): DemandeEnCours;
  /** Vrai si le worker répond au « ping » dans le délai. */
  verifier(delaiMs: number): Promise<boolean>;
  /** Annule tout et arrête le worker. */
  fermer(): void;
}

export type OptionsClient = {
  readonly fabrique: FabriqueCanal;
  readonly programmer: Programmer;
  readonly tirerGraine: () => number;
  /** Budget de temps par défaut d'une grille (le worker abandonne au-delà). */
  readonly budgetMs: number;
  /** Délai supplémentaire avant de considérer le worker comme bloqué (chargement, appareil lent). */
  readonly margeMs: number;
};

/** 4 s : le pire cas mesuré sur PC (~0,65 s, Expert) multiplié par 5 pour une tablette, et un peu plus. */
export const BUDGET_PAR_DEFAUT_MS = 4000;
export const MARGE_PAR_DEFAUT_MS = 10_000;

/** Calcul demandé par une tâche. */
type Travail =
  | { readonly type: 'generer'; readonly niveau: Niveau }
  | { readonly type: 'preparer'; readonly puzzle: Puzzle<Json>; readonly options: OptionsDepart };

/** Tâche interne (objet de travail local, modifié sur place). */
type Tache = {
  readonly requete: number;
  readonly jeu: string;
  readonly travail: Travail;
  readonly priorite: Priorite;
  readonly budgetMs: number;
  readonly resoudre: (resultat: ResultatDemande) => void;
  finie: boolean;
  annulerGardeFou: Annulation | null;
};

/** Vérifie la forme d'une réponse du worker (le contenu de la grille est vérifié à part). */
function estReponseWorker(valeur: unknown): valeur is ReponseWorker {
  if (!estObjet(valeur)) return false;
  const requeteValide = estEntierEntre(valeur['requete'], 0, Number.MAX_SAFE_INTEGER);
  switch (valeur['type']) {
    case 'pret':
      return true;
    case 'genere':
      return requeteValide && 'puzzle' in valeur;
    case 'echec':
      return requeteValide && typeof valeur['raison'] === 'string';
    case 'erreur':
      return (requeteValide || valeur['requete'] === null) && typeof valeur['message'] === 'string';
    default:
      return false;
  }
}

export function creerClientWorker(options: Partial<OptionsClient> & Pick<OptionsClient, 'fabrique'>): ClientWorker {
  const { fabrique, programmer, tirerGraine, budgetMs, margeMs }: OptionsClient = {
    programmer: programmerReel,
    tirerGraine: graineAleatoire,
    budgetMs: BUDGET_PAR_DEFAUT_MS,
    margeMs: MARGE_PAR_DEFAUT_MS,
    ...options,
  };
  if (!estEntierEntre(budgetMs, 1, BUDGET_MAX_MS)) throw new Error(`Budget invalide : ${budgetMs}`);

  let canal: CanalWorker | null = null;
  let prochaineRequete = 1;
  let enCours: Tache | null = null;
  let ferme = false;
  const attente: Tache[] = [];
  const attentesPing = new Set<(pret: boolean) => void>();

  function obtenirCanal(): CanalWorker {
    if (canal !== null) return canal;
    // Les récepteurs ignorent tout message d'un ancien worker (arrêté depuis)
    const nouveau: CanalWorker = fabrique({
      message: (donnees) => {
        if (canal === nouveau) recevoir(donnees);
      },
      erreur: (message) => {
        if (canal === nouveau) surPlantage(message);
      },
    });
    canal = nouveau;
    return nouveau;
  }

  function arreterCanal(): void {
    canal?.arreter();
    canal = null;
  }

  function terminer(tache: Tache, resultat: ResultatDemande): void {
    if (tache.finie) return;
    tache.finie = true;
    tache.annulerGardeFou?.();
    tache.annulerGardeFou = null;
    if (enCours === tache) enCours = null;
    tache.resoudre(resultat);
    lancerSuivante();
  }

  function lancerSuivante(): void {
    if (enCours !== null || ferme || attente.length === 0) return;
    const urgente = attente.findIndex((t) => t.priorite === 'urgent');
    const [tache] = attente.splice(urgente === -1 ? 0 : urgente, 1);
    if (tache === undefined) return;
    enCours = tache;
    tache.annulerGardeFou = programmer(() => {
      if (enCours !== tache) return;
      arreterCanal();
      terminer(tache, { statut: 'erreur', message: 'Le worker ne répond plus (arrêté et relancé).' });
    }, tache.budgetMs + margeMs);
    try {
      const { travail } = tache;
      obtenirCanal().envoyer(
        travail.type === 'generer'
          ? {
              type: 'generer',
              requete: tache.requete,
              jeu: tache.jeu,
              niveau: travail.niveau,
              graine: tirerGraine() >>> 0,
              budgetMs: tache.budgetMs,
            }
          : { type: 'preparer', requete: tache.requete, jeu: tache.jeu, puzzle: travail.puzzle, options: travail.options },
      );
    } catch (erreur) {
      arreterCanal();
      terminer(tache, { statut: 'erreur', message: `Worker indisponible : ${String(erreur)}` });
    }
  }

  function recevoir(donnees: unknown): void {
    if (!estReponseWorker(donnees)) return;
    if (donnees.type === 'pret') {
      for (const resoudre of attentesPing) resoudre(true);
      attentesPing.clear();
      return;
    }
    const tache = enCours;
    if (tache === null || donnees.requete !== tache.requete) return; // réponse périmée
    switch (donnees.type) {
      case 'genere':
        terminer(
          tache,
          estPuzzle(donnees.puzzle)
            ? { statut: 'ok', puzzle: donnees.puzzle }
            : { statut: 'erreur', message: 'Grille reçue invalide' },
        );
        return;
      case 'echec':
        terminer(tache, { statut: 'echec', raison: donnees.raison });
        return;
      case 'erreur':
        terminer(tache, { statut: 'erreur', message: donnees.message });
        return;
    }
  }

  /** Le worker a planté (fichier introuvable, erreur non rattrapée) : on le remplacera. */
  function surPlantage(message: string): void {
    arreterCanal();
    if (enCours !== null) terminer(enCours, { statut: 'erreur', message: `Worker planté : ${message}` });
  }

  function annuler(tache: Tache): void {
    if (tache.finie) return;
    const position = attente.indexOf(tache);
    if (position !== -1) {
      attente.splice(position, 1);
    } else if (enCours === tache) {
      arreterCanal(); // seul moyen d'interrompre un calcul en cours
    }
    terminer(tache, { statut: 'annule' });
  }

  /** Ajoute une tâche à la file (ou la termine tout de suite si le client est fermé, budget invalide). */
  function demander(jeu: string, travail: Travail, priorite: Priorite, budgetDemande: number | null): DemandeEnCours {
    let resoudre: (resultat: ResultatDemande) => void = () => undefined;
    const resultat = new Promise<ResultatDemande>((r) => {
      resoudre = r;
    });
    const tache: Tache = {
      requete: prochaineRequete++,
      jeu,
      travail,
      priorite,
      budgetMs: budgetDemande ?? budgetMs,
      resoudre,
      finie: false,
      annulerGardeFou: null,
    };
    if (ferme) {
      terminer(tache, { statut: 'annule' });
    } else if (!estEntierEntre(tache.budgetMs, 1, BUDGET_MAX_MS)) {
      terminer(tache, { statut: 'erreur', message: `Budget invalide : ${tache.budgetMs}` });
    } else {
      attente.push(tache);
      lancerSuivante();
    }
    return { resultat, annuler: () => annuler(tache) };
  }

  return {
    generer(jeu, niveau, priorite, budgetDemande) {
      return demander(jeu, { type: 'generer', niveau }, priorite, budgetDemande);
    },

    preparer(puzzle, options) {
      return demander(puzzle.jeu, { type: 'preparer', puzzle, options }, 'urgent', null);
    },

    verifier(delaiMs) {
      return new Promise((resoudre) => {
        let annulerMinuterie: Annulation = () => undefined;
        const fin = (pret: boolean): void => {
          annulerMinuterie();
          attentesPing.delete(fin);
          resoudre(pret);
        };
        attentesPing.add(fin);
        annulerMinuterie = programmer(() => fin(false), delaiMs);
        try {
          obtenirCanal().envoyer({ type: 'ping' });
        } catch {
          fin(false);
        }
      });
    },

    fermer() {
      ferme = true;
      for (const tache of [...attente]) annuler(tache);
      if (enCours !== null) annuler(enCours);
      for (const resoudre of [...attentesPing]) resoudre(false);
      arreterCanal();
    },
  };
}
