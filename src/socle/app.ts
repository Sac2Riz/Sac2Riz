// L'APPLI : navigation entre l'accueil et l'écran de partie, et enchaînement des services.
//
// Nouvelle partie sur un jeu qui a déjà une partie en cours :
//   1. confirmation demandée au joueur (sinon on ne fait rien) ;
//   2. grille obtenue (réserve, pack ou génération urgente avec indicateur de chargement) ;
//   3. SEULEMENT ALORS l'ancienne partie compte comme abandonnée et est remplacée
//      (si le joueur annule le chargement, son ancienne partie reste intacte).
// Bouton « retour » d'Android pendant une partie : retour à l'accueil (une entrée est ajoutée à
// l'historique du navigateur en entrant dans la partie), sans quitter l'appli.

import type { Json } from '../types/json.ts';
import { INFOS_NIVEAUX, type Niveau } from '../types/niveaux.ts';
import type { Reglages } from '../types/sauvegarde.ts';
import type { ModuleJeuQuelconque, VueJeu } from '../types/vue.ts';
import { afficherAccueil, type JeuAccueil } from './accueil.ts';
import { afficherChargement } from './chargement.ts';
import { confirmer, informer } from './dialogue.ts';
import { afficherPartie, type EcranPartie } from './ecran-partie.ts';
import { formaterTemps } from './format.ts';
import { depuisSauvegarde, nouvellePartie, versSauvegarde, type Logique, type Partie } from './partie.ts';
import type { ServiceParties } from './service-parties.ts';
import type { ServiceReserve } from './reserve.ts';
import { appliquerTheme, themeSuivant } from './theme.ts';
import { estVisible } from './visibilite.ts';

export type OptionsApp = {
  readonly racine: HTMLElement;
  readonly jeux: readonly ModuleJeuQuelconque[];
  readonly parties: ServiceParties;
  readonly reserve: ServiceReserve;
  readonly reglages: Reglages;
  /** Enregistre les réglages modifiés (thème choisi à l'accueil). */
  readonly enregistrerReglages: (reglages: Reglages) => Promise<void>;
};

export function demarrerApp(o: OptionsApp): void {
  const maintenant = (): number => Date.now();
  let ecranPartie: EcranPartie | null = null;
  /** Vrai pendant une opération (chargement, confirmation) : ignore les doubles touchers. */
  let occupe = false;
  let reglages = o.reglages;

  function changerTheme(): Reglages['theme'] {
    reglages = { ...reglages, theme: themeSuivant(reglages.theme) };
    appliquerTheme(reglages.theme);
    o.enregistrerReglages(reglages).catch((erreur: unknown) => console.error('Réglages non enregistrés :', erreur));
    return reglages.theme;
  }

  function moduleDe(id: string): ModuleJeuQuelconque {
    const module = o.jeux.find((j) => j.meta.id === id);
    if (module === undefined) throw new Error(`Jeu inconnu : ${id}`);
    return module;
  }

  async function chargerJeu(id: string): Promise<{ logique: Logique; vue: VueJeu<Json, Json, Json> }> {
    const module = moduleDe(id);
    const [logique, vue] = await Promise.all([module.chargerLogique(), module.chargerVue()]);
    return { logique, vue };
  }

  async function accueil(): Promise<void> {
    const jeux: JeuAccueil[] = await Promise.all(
      o.jeux.map(async (module) => ({ module, partie: await o.parties.lire(module.meta.id) })),
    );
    if (ecranPartie !== null) return; // une partie a été ouverte entre-temps
    afficherAccueil(o.racine, jeux, {
      continuer: (jeu) => void enSecurite(() => continuer(jeu)),
      nouvelle: (jeu, niveau) => void enSecurite(() => nouvelle(jeu, niveau)),
      theme: reglages.theme,
      changerTheme,
    });
  }

  /** Une seule opération à la fois ; toute erreur inattendue est signalée au joueur. */
  async function enSecurite(operation: () => Promise<void>): Promise<void> {
    if (occupe) return;
    occupe = true;
    try {
      await operation();
    } catch (erreur) {
      console.error(erreur);
      await informer('Oups', `Une erreur est survenue : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
      await accueil();
    } finally {
      occupe = false;
    }
  }

  function ouvrir(logique: Logique, vue: VueJeu<Json, Json, Json>, partie: Partie): void {
    history.pushState({ ecran: 'partie' }, '');
    ecranPartie = afficherPartie({
      conteneur: o.racine,
      logique,
      vue,
      partie,
      reglages,
      parties: o.parties,
      maintenant,
      quitter: () => {
        ecranPartie = null;
        // Retour par le bouton de l'écran : on retire aussi l'entrée ajoutée à l'historique
        if (history.state !== null) history.back();
        void accueil();
      },
    });
  }

  async function continuer(id: string): Promise<void> {
    const [sauvegarde, { logique, vue }] = await Promise.all([o.parties.lire(id), chargerJeu(id)]);
    if (sauvegarde === null) return accueil();
    const partie = depuisSauvegarde(logique, sauvegarde, maintenant(), estVisible(document));
    if (partie === null) {
      await o.parties.oublier(id);
      await informer('Partie illisible', 'La partie enregistrée ne peut pas être reprise. Elle a été supprimée.');
      return accueil();
    }
    ouvrir(logique, vue, partie);
  }

  async function nouvelle(id: string, niveau: Niveau): Promise<void> {
    const enCours = await o.parties.lire(id);
    if (enCours !== null) {
      const ancien = INFOS_NIVEAUX[enCours.puzzle.notation.niveau].nom;
      const ok = await confirmer(
        'Remplacer la partie en cours ?',
        `Votre partie ${ancien} (${formaterTemps(enCours.chronoMs)}) sera comptée comme abandonnée dans les statistiques.`,
        'Nouvelle partie',
      );
      if (!ok) return;
    }

    const demande = o.reserve.obtenirGrille(id, niveau);
    const chargement = afficherChargement('Préparation de la grille…', () => demande.annuler());
    const [resultat, jeu] = await Promise.all([demande.resultat, chargerJeu(id)]).finally(() => chargement.fermer());
    if (resultat.statut === 'annule') return;
    if (resultat.statut === 'erreur') {
      await informer('Grille indisponible', `Impossible de préparer une grille : ${resultat.message}`);
      return;
    }
    const { puzzle } = resultat;
    if (puzzle.jeu !== id || !jeu.logique.estDonnees(puzzle.donnees)) {
      await informer('Grille indisponible', 'La grille obtenue est invalide. Réessayez.');
      return;
    }

    if (enCours !== null) await o.parties.abandonner(id);
    const instant = maintenant();
    const partie = nouvellePartie(jeu.logique, puzzle, instant, new Date(instant).toISOString(), estVisible(document));
    await o.parties.sauvegarder(versSauvegarde(jeu.logique, partie, instant, new Date(instant).toISOString()));
    ouvrir(jeu.logique, jeu.vue, partie);
  }

  // Bouton « retour » d'Android (ou du navigateur) pendant une partie.
  // Au démarrage (y compris après un rechargement en pleine partie), on part de l'accueil.
  history.replaceState(null, '');
  window.addEventListener('popstate', () => {
    if (ecranPartie !== null) void ecranPartie.quitter();
  });

  void accueil();
}
