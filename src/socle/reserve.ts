// RÉSERVE DE GRILLES : quelques grilles d'avance par jeu et par niveau, stockées (magasin
// « reserve »), pour qu'une partie démarre instantanément.
//
// obtenirGrille(jeu, niveau), quand le joueur lance une partie :
//   1. prend la plus ancienne grille de la réserve (prise ATOMIQUE : jamais servie deux fois) ;
//   2. sinon une grille du pack du jeu, s'il en a un pour ce niveau ;
//   3. sinon une génération « urgente », relancée immédiatement en cas d'échec jusqu'à réussir
//      ou être annulée (après quelques ERREURS techniques d'affilée, on abandonne : un jeu
//      introuvable ne réussira jamais).
// Puis la réserve est réalimentée en arrière-plan.
//
// Réalimentation (reapprovisionner) : une grille à la fois, d'abord le jeu et le niveau en cours,
// puis les autres niveaux de ce jeu du plus facile au plus difficile, puis les autres jeux.
// Un couple jeu/niveau en échec est mis de côté 30 s, puis 2 min, puis 10 min (les autres
// continuent). Une génération urgente interrompt la réalimentation, qui reprend ensuite.

import type { Puzzle } from '../types/jeu.ts';
import type { Json } from '../types/json.ts';
import { NIVEAUX, type Niveau } from '../types/niveaux.ts';
import type { EntreeReserve } from '../types/sauvegarde.ts';
import type { ClientWorker, DemandeEnCours } from './client-worker.ts';
import { journalConsole, programmerReel, type Annulation, type Journal, type Programmer } from './environnement.ts';
import type { ServicePacks } from './packs.ts';
import { cleJeuNiveau, prefixeReserve, type Stockage } from './stockage/stockage.ts';

/** Ce que la réserve sait d'un jeu (extrait de MetaJeu). */
export type JeuReserve = { readonly id: string; readonly niveaux: readonly Niveau[] };

export type Cible = { readonly jeu: string; readonly niveau: Niveau };

export type OrigineGrille = 'reserve' | 'pack' | 'generee';

export type GrilleObtenue =
  | { readonly statut: 'ok'; readonly puzzle: Puzzle<Json>; readonly origine: OrigineGrille }
  | { readonly statut: 'annule' }
  | { readonly statut: 'erreur'; readonly message: string };

export type DemandeGrille = {
  readonly resultat: Promise<GrilleObtenue>;
  readonly annuler: () => void;
};

export interface ServiceReserve {
  obtenirGrille(jeu: string, niveau: Niveau): DemandeGrille;
  /** Lance (ou réoriente) la réalimentation, en commençant par ce jeu et ce niveau. */
  reapprovisionner(jeu: string, niveau: Niveau): void;
  /** Arrête tout (génération en cours annulée, relances programmées oubliées). */
  arreter(): void;
  /** Se résout quand la réalimentation n'a plus rien à faire pour l'instant (utile aux tests). */
  auRepos(): Promise<void>;
}

export type OptionsReserve = {
  readonly stockage: Stockage;
  readonly generateur: Pick<ClientWorker, 'generer'>;
  readonly packs: ServicePacks;
  readonly jeux: readonly JeuReserve[];
  readonly programmer: Programmer;
  /** Horloge en millisecondes (Date.now) : dates d'ajout, clés, délais de relance. */
  readonly maintenant: () => number;
  readonly journal: Journal;
  /** Nombre de grilles d'avance visé par jeu et par niveau. */
  readonly taille: number;
  /** Délais avant de réessayer un couple jeu/niveau après 1, 2, 3… échecs (le dernier se répète). */
  readonly delaisRelanceMs: readonly number[];
  /** Erreurs techniques consécutives tolérées pour une génération urgente. */
  readonly erreursUrgentesMax: number;
};

export const TAILLE_RESERVE = 3;
export const DELAIS_RELANCE_MS: readonly number[] = [30_000, 120_000, 600_000];

/** Ordre de réalimentation : la cible en cours, ses autres niveaux (facile → difficile), les autres jeux. */
export function ordreReapprovisionnement(jeux: readonly JeuReserve[], courant: Cible): Cible[] {
  const trier = (niveaux: readonly Niveau[]): Niveau[] => NIVEAUX.filter((n) => niveaux.includes(n));
  const ordre: Cible[] = [courant];
  const jeuCourant = jeux.find((j) => j.id === courant.jeu);
  if (jeuCourant !== undefined) {
    for (const niveau of trier(jeuCourant.niveaux)) {
      if (niveau !== courant.niveau) ordre.push({ jeu: courant.jeu, niveau });
    }
  }
  for (const jeu of jeux) {
    if (jeu.id === courant.jeu) continue;
    for (const niveau of trier(jeu.niveaux)) ordre.push({ jeu: jeu.id, niveau });
  }
  return ordre;
}

type OptionsObligatoires = 'stockage' | 'generateur' | 'packs' | 'jeux';

export function creerServiceReserve(
  options: Partial<OptionsReserve> & Pick<OptionsReserve, OptionsObligatoires>,
): ServiceReserve {
  const o: OptionsReserve = {
    programmer: programmerReel,
    maintenant: Date.now,
    journal: journalConsole,
    taille: TAILLE_RESERVE,
    delaisRelanceMs: DELAIS_RELANCE_MS,
    erreursUrgentesMax: 3,
    ...options,
  };

  // État de travail du service (local, modifié sur place)
  let ordre: Cible[] = [];
  let arrete = false;
  let urgences = 0;
  let compteurCles = 0;
  let demandeFond: DemandeEnCours | null = null;
  let boucleActive: Promise<void> | null = null;
  let relancerApres = false;
  const echecs = new Map<string, { nombre: number; reprise: number }>();
  const relancesProgrammees = new Set<Annulation>();

  /** Clé de la réserve : triée par date d'ajout (les plus anciennes servies d'abord). */
  function nouvelleCle(cible: Cible): string {
    const horodatage = String(Math.floor(o.maintenant())).padStart(16, '0');
    const compteur = String(compteurCles++).padStart(6, '0');
    return `${prefixeReserve(cible.jeu, cible.niveau)}${horodatage}-${compteur}`;
  }

  async function prochaineCible(): Promise<Cible | null> {
    for (const cible of ordre) {
      const echec = echecs.get(cleJeuNiveau(cible.jeu, cible.niveau));
      if (echec !== undefined && o.maintenant() < echec.reprise) continue;
      if ((await o.stockage.compter('reserve', prefixeReserve(cible.jeu, cible.niveau))) < o.taille) return cible;
    }
    return null;
  }

  function noterEchec(cible: Cible, message: string): void {
    const cle = cleJeuNiveau(cible.jeu, cible.niveau);
    const nombre = (echecs.get(cle)?.nombre ?? 0) + 1;
    const delai = o.delaisRelanceMs[Math.min(nombre, o.delaisRelanceMs.length) - 1] ?? 60_000;
    echecs.set(cle, { nombre, reprise: o.maintenant() + delai });
    o.journal(`Réserve ${cle} : échec n° ${nombre} (${message}), nouvel essai dans ${delai / 1000} s.`);
    const annulation = o.programmer(() => {
      relancesProgrammees.delete(annulation);
      lancerBoucle();
    }, delai);
    relancesProgrammees.add(annulation);
  }

  /** Puzzle reçu cohérent avec la demande (sinon il serait rejeté par la garde du magasin). */
  function estPourCible(puzzle: Puzzle<Json>, cible: Cible): boolean {
    return puzzle.jeu === cible.jeu && puzzle.notation.niveau === cible.niveau;
  }

  async function boucle(): Promise<void> {
    while (!arrete && urgences === 0) {
      const cible = await prochaineCible();
      if (cible === null || arrete || urgences > 0) return;
      const demande = o.generateur.generer(cible.jeu, cible.niveau, 'fond');
      demandeFond = demande;
      const resultat = await demande.resultat;
      demandeFond = null;
      if (resultat.statut === 'annule') return; // urgence ou arrêt : on reprendra plus tard
      if (resultat.statut === 'ok' && estPourCible(resultat.puzzle, cible)) {
        const entree: EntreeReserve = {
          jeu: cible.jeu,
          niveau: cible.niveau,
          ajouteLe: new Date(o.maintenant()).toISOString(),
          puzzle: resultat.puzzle,
        };
        await o.stockage.ecrire('reserve', nouvelleCle(cible), entree);
        echecs.delete(cleJeuNiveau(cible.jeu, cible.niveau));
      } else {
        const message =
          resultat.statut === 'echec'
            ? resultat.raison
            : resultat.statut === 'erreur'
              ? resultat.message
              : 'grille d\'un autre jeu ou niveau';
        noterEchec(cible, message);
      }
    }
  }

  function lancerBoucle(): void {
    if (arrete) return;
    if (boucleActive !== null) {
      relancerApres = true; // la boucle en cours est peut-être sur le point de s'arrêter
      return;
    }
    relancerApres = false;
    boucleActive = boucle()
      .catch((erreur: unknown) => o.journal(`Réserve : erreur de réalimentation (${String(erreur)}).`))
      .finally(() => {
        boucleActive = null;
        if (relancerApres) lancerBoucle();
      });
  }

  function reapprovisionner(jeu: string, niveau: Niveau): void {
    if (arrete) return;
    ordre = ordreReapprovisionnement(o.jeux, { jeu, niveau });
    lancerBoucle();
  }

  /** Génération urgente, relancée sans délai jusqu'à réussir, être annulée ou trop d'erreurs. */
  async function genererUrgence(
    cible: Cible,
    etat: { annule: boolean; demande: DemandeEnCours | null },
  ): Promise<GrilleObtenue> {
    urgences++;
    demandeFond?.annuler(); // libère le worker tout de suite
    try {
      let erreurs = 0;
      while (!etat.annule && !arrete) {
        const demande = o.generateur.generer(cible.jeu, cible.niveau, 'urgent');
        etat.demande = demande;
        const resultat = await demande.resultat;
        etat.demande = null;
        switch (resultat.statut) {
          case 'ok':
            if (estPourCible(resultat.puzzle, cible)) return { statut: 'ok', puzzle: resultat.puzzle, origine: 'generee' };
            erreurs++;
            break;
          case 'annule':
            return { statut: 'annule' };
          case 'erreur':
            erreurs++;
            o.journal(`Génération urgente ${cleJeuNiveau(cible.jeu, cible.niveau)} : ${resultat.message}`);
            break;
          case 'echec':
            erreurs = 0; // budget épuisé : simple malchance, on relance immédiatement
            break;
        }
        if (erreurs >= o.erreursUrgentesMax) {
          return { statut: 'erreur', message: `Impossible de générer une grille (${erreurs} erreurs d'affilée).` };
        }
      }
      return { statut: 'annule' };
    } finally {
      urgences--;
    }
  }

  async function obtenir(
    cible: Cible,
    etat: { annule: boolean; demande: DemandeEnCours | null },
  ): Promise<GrilleObtenue> {
    const deReserve = await o.stockage.prendrePremier('reserve', prefixeReserve(cible.jeu, cible.niveau));
    if (deReserve !== null) {
      if (etat.annule) {
        await o.stockage.ecrire('reserve', deReserve.cle, deReserve.valeur); // remise en place
        return { statut: 'annule' };
      }
      return { statut: 'ok', puzzle: deReserve.valeur.puzzle, origine: 'reserve' };
    }
    if (etat.annule) return { statut: 'annule' };
    const dePack = await o.packs.tirer(cible.jeu, cible.niveau);
    if (dePack !== null) return etat.annule ? { statut: 'annule' } : { statut: 'ok', puzzle: dePack, origine: 'pack' };
    if (etat.annule) return { statut: 'annule' };
    return genererUrgence(cible, etat);
  }

  return {
    obtenirGrille(jeu, niveau) {
      const cible: Cible = { jeu, niveau };
      const etat: { annule: boolean; demande: DemandeEnCours | null } = { annule: false, demande: null };
      const resultat = obtenir(cible, etat)
        .catch((erreur: unknown): GrilleObtenue => ({ statut: 'erreur', message: String(erreur) }))
        .finally(() => reapprovisionner(jeu, niveau));
      return {
        resultat,
        annuler: () => {
          etat.annule = true;
          etat.demande?.annuler();
        },
      };
    },
    reapprovisionner,
    arreter() {
      arrete = true;
      demandeFond?.annuler();
      for (const annulation of relancesProgrammees) annulation();
      relancesProgrammees.clear();
    },
    async auRepos() {
      while (boucleActive !== null) await boucleActive;
    },
  };
}
