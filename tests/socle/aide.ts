// Outils communs aux tests des services du socle : horloge factice, puzzles factices,
// faux générateur (pour la réserve) et faux worker (pour le client).

import type { CanalWorker, DemandeEnCours, FabriqueCanal, Priorite, Recepteurs, ResultatDemande } from '../../src/socle/client-worker.ts';
import type { Annulation, Programmer } from '../../src/socle/environnement.ts';
import type { Puzzle } from '../../src/types/jeu.ts';
import type { Json } from '../../src/types/json.ts';
import { INFOS_NIVEAUX, type Niveau } from '../../src/types/niveaux.ts';
import type { DemandeWorker } from '../../src/types/worker.ts';

/** Laisse s'exécuter toutes les promesses en attente (le stockage en mémoire n'attend jamais d'E/S). */
export function laisserFiler(): Promise<void> {
  return new Promise((resoudre) => setImmediate(resoudre));
}

/** Horloge qu'on fait avancer à la main ; les rappels programmés s'exécutent quand leur heure arrive. */
export class HorlogeFactice {
  private heure = 1_700_000_000_000;
  private prochainId = 0;
  private readonly prevus = new Map<number, { heure: number; rappel: () => void }>();

  readonly maintenant = (): number => this.heure;

  readonly programmer: Programmer = (rappel, delaiMs): Annulation => {
    const id = this.prochainId++;
    this.prevus.set(id, { heure: this.heure + delaiMs, rappel });
    return () => this.prevus.delete(id);
  };

  /** Nombre de rappels en attente. */
  get enAttente(): number {
    return this.prevus.size;
  }

  /** Avance l'heure ; exécute dans l'ordre les rappels dont l'heure est atteinte. */
  avancer(ms: number): void {
    const fin = this.heure + ms;
    for (;;) {
      const dus = [...this.prevus.entries()].filter(([, p]) => p.heure <= fin).sort((a, b) => a[1].heure - b[1].heure);
      const premier = dus[0];
      if (premier === undefined) break;
      const [id, prevu] = premier;
      this.prevus.delete(id);
      this.heure = Math.max(this.heure, prevu.heure);
      prevu.rappel();
    }
    this.heure = fin;
  }
}

let compteurPuzzles = 0;

/** Puzzle factice valide, identifiable par sa graine (unique à chaque appel). */
export function puzzleFactice(jeu: string, niveau: Niveau): Puzzle<Json> {
  compteurPuzzles++;
  return {
    jeu,
    graine: compteurPuzzles,
    notation: { niveau, force: INFOS_NIVEAUX[niveau].forceMin, techniqueMax: 'test', details: { test: 1 } },
    donnees: { numero: compteurPuzzles },
  };
}

type DemandeEnregistree = {
  readonly jeu: string;
  readonly niveau: Niveau;
  readonly priorite: Priorite;
  readonly resoudre: (resultat: ResultatDemande) => void;
  annulee: boolean;
  terminee: boolean;
};

/**
 * Faux générateur pour la réserve. « politique » décide de la réponse de chaque demande :
 * un résultat (renvoyé aussitôt) ou null (la demande reste en attente ; on y répond avec repondre()).
 */
export class FauxGenerateur {
  readonly demandes: DemandeEnregistree[] = [];
  politique: (jeu: string, niveau: Niveau, priorite: Priorite) => ResultatDemande | null = (jeu, niveau) => ({
    statut: 'ok',
    puzzle: puzzleFactice(jeu, niveau),
  });

  generer(jeu: string, niveau: Niveau, priorite: Priorite): DemandeEnCours {
    let resoudre: (resultat: ResultatDemande) => void = () => undefined;
    const resultat = new Promise<ResultatDemande>((r) => {
      resoudre = r;
    });
    const demande: DemandeEnregistree = {
      jeu,
      niveau,
      priorite,
      annulee: false,
      terminee: false,
      resoudre: (r) => {
        if (demande.terminee) return; // une seule réponse par demande
        demande.terminee = true;
        resoudre(r);
      },
    };
    this.demandes.push(demande);
    const immediat = this.politique(jeu, niveau, priorite);
    if (immediat !== null) demande.resoudre(immediat);
    return {
      resultat,
      annuler: () => {
        if (demande.terminee) return;
        demande.annulee = true;
        demande.resoudre({ statut: 'annule' });
      },
    };
  }

  /** Demandes encore sans réponse. */
  enAttente(): DemandeEnregistree[] {
    return this.demandes.filter((d) => !d.terminee);
  }
}

/** Faux worker : garde les messages envoyés ; le test répond via recepteurs. */
export type FauxCanal = CanalWorker & {
  readonly envoyes: DemandeWorker[];
  readonly recepteurs: Recepteurs;
  arrete: boolean;
};

export function fabriqueFactice(): { readonly fabrique: FabriqueCanal; readonly canaux: FauxCanal[] } {
  const canaux: FauxCanal[] = [];
  const fabrique: FabriqueCanal = (recepteurs) => {
    const canal: FauxCanal = {
      envoyes: [],
      recepteurs,
      arrete: false,
      envoyer(demande) {
        if (canal.arrete) throw new Error('canal arrêté');
        canal.envoyes.push(demande);
      },
      arreter() {
        canal.arrete = true;
      },
    };
    canaux.push(canal);
    return canal;
  };
  return { fabrique, canaux };
}
