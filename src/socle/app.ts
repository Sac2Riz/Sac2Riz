// L'APPLI : navigation entre les écrans et enchaînement des services.
//
// Écrans (étape 6a, voir navigation.ts) : accueil (liste des jeux) → fiche d'un jeu → partie (puis
// fin de partie) ; statistiques de tous les jeux (depuis l'accueil) ou d'un jeu (depuis sa fiche).
// Les réglages sont une fenêtre par-dessus. Chaque cran vers le bas ajoute UNE entrée à
// l'historique du navigateur ; la fin de partie et la partie suivante remplacent l'entrée de la
// partie. Le bouton « retour » d'Android (ou un bouton « ← » de l'écran, qui fait history.back())
// remonte d'un cran : partie → fiche du jeu → accueil, sans quitter l'appli. La partie est
// sauvegardée avant d'être quittée.
//
// Nouvelle partie sur un jeu qui a déjà une partie en cours :
//   1. confirmation demandée au joueur (sinon on ne fait rien) ;
//   2. grille obtenue (réserve, pack ou génération urgente avec indicateur de chargement), puis,
//      si un réglage du jeu qui change la grille est activé (ReglageJeu.preparation), préparée dans
//      le worker (LogiqueJeu.preparer, sous le même indicateur) ; si la préparation échoue, la
//      grille est jouée telle quelle ;
//   3. SEULEMENT ALORS l'ancienne partie compte comme abandonnée et est remplacée
//      (si le joueur annule le chargement, son ancienne partie reste intacte).
// Une partie reprise (« Continuer ») n'est jamais préparée : un réglage changé ne la modifie pas.
// Mise à jour de l'appli (étape 5) : demarrerApp renvoie sauvegarder(), appelée avant de passer à
// la nouvelle version (la partie en cours est enregistrée, chrono compris).

import type { MetaJeu, Puzzle, ValeursReglagesJeu } from '../types/jeu.ts';
import type { Json } from '../types/json.ts';
import type { Niveau } from '../types/niveaux.ts';
import type { PartieSauvegardee, Reglages } from '../types/sauvegarde.ts';
import type { ModuleJeuQuelconque, VueJeu } from '../types/vue.ts';
import { preparationDemandee } from '../utils/reglages-jeu.ts';
import { afficherAccueil, type JeuAccueil } from './accueil.ts';
import type { BilanFin } from './bilan-fin.ts';
import { afficherChargement } from './chargement.ts';
import type { DemandeEnCours } from './client-worker.ts';
import type { ActionsDonnees } from './donnees/actions-donnees.ts';
import { confirmer, informer } from './dialogue.ts';
import { afficherFiche, type PartieFiche } from './ecran-fiche.ts';
import { afficherFin } from './ecran-fin.ts';
import { afficherPartie, type EcranPartie } from './ecran-partie.ts';
import { ouvrirReglages } from './ecran-reglages.ts';
import { afficherStats } from './ecran-stats.ts';
import { formaterTemps, libelleForce } from './format.ts';
import { ACCUEIL, ancetre, changementHistorique, profondeur, type Ecran } from './navigation.ts';
import { depuisSauvegarde, nouvellePartie, versSauvegarde, type Logique, type Partie } from './partie.ts';
import { reglagesDuJeu, reglagesVue } from './reglages.ts';
import type { ServiceParties } from './service-parties.ts';
import type { ServiceReserve } from './reserve.ts';
import { appliquerAffichage } from './style/appliquer.ts';
import { estVisible } from './visibilite.ts';

export type OptionsApp = {
  readonly racine: HTMLElement;
  readonly jeux: readonly ModuleJeuQuelconque[];
  readonly parties: ServiceParties;
  readonly reserve: ServiceReserve;
  readonly reglages: Reglages;
  /** Prépare dans le worker la grille d'une nouvelle partie (LogiqueJeu.preparer : aide au départ). */
  readonly preparer: (puzzle: Puzzle<Json>, reglages: ValeursReglagesJeu) => DemandeEnCours;
  /** Enregistre les réglages modifiés (écran des réglages). */
  readonly enregistrerReglages: (reglages: Reglages) => Promise<void>;
  /** Export / import des données (section « Application » des réglages). */
  readonly donnees: ActionsDonnees;
  /** Version de l'appli mise en forme (« 14/11/2026 17:30 · a1b2c3d4 »), pour les réglages. */
  readonly version: Promise<string>;
  /**
   * Nouveau bouton « Mettre à jour » (socle/pwa/annonce-mise-a-jour.ts), placé à côté de chaque
   * bouton Réglages ; masqué tant qu'aucune nouvelle version n'est prête.
   */
  readonly boutonMiseAJour: () => HTMLElement;
};

/** Ce que l'appli expose à main.ts. */
export type App = {
  /** Enregistre tout de suite la partie en cours, s'il y en a une (avant une mise à jour). */
  readonly sauvegarder: () => Promise<void>;
};

/** Entrée de l'historique du navigateur : profondeur de l'écran (0 = accueil). */
type EtatHistorique = { readonly profondeur: number };

function profondeurHistorique(etat: unknown): number {
  if (typeof etat !== 'object' || etat === null || !('profondeur' in etat)) return 0;
  const p: unknown = etat.profondeur;
  return typeof p === 'number' && Number.isInteger(p) && p >= 0 ? p : 0;
}

export function demarrerApp(o: OptionsApp): App {
  const maintenant = (): number => Date.now();
  let courant: Ecran = ACCUEIL;
  /** Écran de partie affiché (fermé — donc sauvegardé — avant de le quitter). */
  let partieOuverte: EcranPartie | null = null;
  /** Augmente à chaque changement d'écran : un affichage commencé avant est abandonné. */
  let jeton = 0;
  /** Vrai pendant une opération (chargement, confirmation) : ignore les doubles touchers. */
  let occupe = false;
  let reglages = o.reglages;

  // ---------- Réglages ----------
  function changerReglages(nouveaux: Reglages): void {
    reglages = nouveaux;
    appliquerAffichage(reglages);
    o.enregistrerReglages(reglages).catch((erreur: unknown) => console.error('Réglages non enregistrés :', erreur));
  }

  /**
   * Fenêtre des réglages. Section « Par jeu » : tous les jeux, ou seulement le jeu en cours pendant
   * une partie. L'import n'y est pas proposé pendant une partie (voir ecran-reglages.ts).
   */
  const afficherReglages = (jeux: readonly MetaJeu[]): Promise<void> =>
    ouvrirReglages(() => reglages, changerReglages, {
      sauvegarde: { exporter: o.donnees.exporter, importer: partieOuverte === null ? o.donnees.importer : null },
      version: o.version,
      jeux,
    });

  // ---------- Navigation ----------
  /** Passe à un écran plus bas (nouvelle entrée d'historique) ou de même profondeur (entrée remplacée). */
  function aller(vers: Ecran): void {
    const etat: EtatHistorique = { profondeur: profondeur(vers) };
    if (changementHistorique(courant, vers) === 'ajouter') history.pushState(etat, '');
    else history.replaceState(etat, '');
    courant = vers;
    jeton++;
  }

  /** Bouton « ← » d'un écran : comme le bouton retour d'Android (traité par popstate). */
  const retour = (): void => history.back();

  /** Remonte vers un écran parent (bouton retour) : ferme la partie (sauvegarde) puis l'affiche. */
  async function remonter(vers: Ecran): Promise<void> {
    const partie = partieOuverte;
    partieOuverte = null;
    courant = vers;
    jeton++;
    if (partie !== null) await partie.fermer();
    await afficher(vers);
  }

  /** Affiche un écran « simple » (accueil, fiche, statistiques) d'après l'écran courant. */
  async function afficher(ecran: Ecran): Promise<void> {
    switch (ecran.type) {
      case 'accueil':
        return accueil();
      case 'fiche':
        return fiche(ecran.jeu);
      case 'stats':
        return statistiques(ecran.jeu);
      case 'partie':
      case 'fin':
        // Jamais atteint en remontant (leurs parents sont la fiche) : par sécurité, la fiche
        return fiche(ecran.jeu);
    }
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

  /** Une seule opération à la fois ; toute erreur inattendue est signalée au joueur. */
  async function enSecurite(operation: () => Promise<void>): Promise<void> {
    if (occupe) return;
    occupe = true;
    try {
      await operation();
    } catch (erreur) {
      console.error(erreur);
      await informer('Oups', `Une erreur est survenue : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
      // Écran simple : redessiné ; partie ou fin de partie : retour à la fiche du jeu
      if (courant.type === 'partie' || courant.type === 'fin') retour();
      else await afficher(courant).catch((e: unknown) => console.error(e));
    } finally {
      occupe = false;
    }
  }

  // ---------- Écrans ----------
  async function accueil(): Promise<void> {
    const j = jeton;
    const jeux: JeuAccueil[] = await Promise.all(
      o.jeux.map(async (module) => ({ module, partie: await o.parties.lire(module.meta.id) })),
    );
    if (j !== jeton) return; // un autre écran a été ouvert entre-temps
    const apercus = afficherAccueil(o.racine, jeux, {
      ouvrir: (id) => void enSecurite(() => ouvrirFiche(id)),
      statistiques: () => void enSecurite(() => ouvrirStats(null)),
      reglages: () => void afficherReglages(o.jeux.map((m) => m.meta)),
      boutonMiseAJour: o.boutonMiseAJour,
    });
    // Aperçus dessinés dès que chaque jeu est chargé (l'accueil s'affiche sans les attendre)
    for (const { module, partie } of jeux) {
      const zone = apercus.get(module.meta.id);
      if (zone === undefined) continue;
      apercuDuJeu(module, partie)
        .then(({ vue, affichage }) => {
          if (j === jeton) vue.apercu(zone, affichage);
        })
        .catch((erreur: unknown) => console.error(`Aperçu de ${module.meta.id} impossible :`, erreur));
    }
  }

  /** Ce que montre l'aperçu d'un jeu : la partie en cours (rejouée comme pour « Continuer »), sinon l'exemple. */
  async function apercuDuJeu(
    module: ModuleJeuQuelconque,
    sauvegarde: PartieSauvegardee | null,
  ): Promise<{ vue: VueJeu<Json, Json, Json>; affichage: { readonly donnees: Json; readonly etat: Json } }> {
    const [contenu, logique, vue] = await Promise.all([module.chargerFiche(), module.chargerLogique(), module.chargerVue()]);
    const relue = sauvegarde === null ? null : depuisSauvegarde(logique, sauvegarde, maintenant(), false);
    return { vue, affichage: relue === null ? contenu.exemple : { donnees: relue.puzzle.donnees, etat: relue.etat } };
  }

  async function ouvrirFiche(id: string): Promise<void> {
    aller({ type: 'fiche', jeu: id });
    await fiche(id);
  }

  async function fiche(id: string): Promise<void> {
    const j = jeton;
    const module = moduleDe(id);
    const [sauvegarde, contenu, logique, vue] = await Promise.all([
      o.parties.lire(id),
      module.chargerFiche(),
      module.chargerLogique(),
      module.chargerVue(),
    ]);
    if (j !== jeton) return;
    let partie: PartieFiche | null = null;
    if (sauvegarde !== null) {
      // L'aperçu montre la partie telle qu'elle est (rejouée comme pour « Continuer »)
      const relue = depuisSauvegarde(logique, sauvegarde, maintenant(), false);
      const { niveau, force } = sauvegarde.puzzle.notation;
      partie = { niveau, force, chronoMs: sauvegarde.chronoMs, etat: relue?.etat ?? null, donnees: sauvegarde.puzzle.donnees };
    }
    afficherFiche(o.racine, { meta: module.meta, fiche: contenu, vue, partie }, {
      continuer: () => void enSecurite(() => continuer(id)),
      nouvelle: (niveau) => void enSecurite(() => nouvelle(id, niveau)),
      statistiques: () => void enSecurite(() => ouvrirStats(id)),
      reglages: () => void afficherReglages(o.jeux.map((m) => m.meta)),
      boutonMiseAJour: o.boutonMiseAJour,
      retour,
    });
  }

  async function ouvrirStats(jeu: string | null): Promise<void> {
    aller({ type: 'stats', jeu });
    await statistiques(jeu);
  }

  /** Statistiques de tous les jeux (jeu = null) ou d'un seul. */
  async function statistiques(jeu: string | null): Promise<void> {
    const j = jeton;
    const modules = jeu === null ? o.jeux : [moduleDe(jeu)];
    const jeux = await Promise.all(modules.map(async ({ meta }) => ({ meta, stats: await o.parties.stats(meta.id) })));
    if (j !== jeton) return;
    const seul = jeu === null ? null : (modules[0]?.meta ?? null);
    afficherStats(o.racine, jeux, {
      titre: seul === null ? 'Statistiques' : `Statistiques — ${seul.nom}`,
      libelleRetour: seul === null ? 'Retour à l\'accueil' : 'Retour à la fiche du jeu',
      retour,
    });
  }

  function fin(bilan: BilanFin): void {
    partieOuverte = null; // l'écran de partie s'est déjà libéré
    aller({ type: 'fin', jeu: bilan.jeu });
    afficherFin(o.racine, bilan, {
      retour,
      nouvelle: () => void enSecurite(() => nouvelle(bilan.jeu, bilan.niveau)),
    });
  }

  function ouvrirPartie(logique: Logique, vue: VueJeu<Json, Json, Json>, partie: Partie): void {
    const meta = logique.meta;
    // aller() avant l'affichage : l'écran courant est déjà « partie » pendant qu'elle se dessine
    aller({ type: 'partie', jeu: meta.id });
    partieOuverte = afficherPartie({
      conteneur: o.racine,
      logique,
      vue,
      partie,
      reglages: () => reglagesVue(reglages, meta),
      ouvrirReglages: () => afficherReglages([meta]),
      boutonMiseAJour: o.boutonMiseAJour,
      parties: o.parties,
      maintenant,
      retour,
      finir: fin,
    });
  }

  async function continuer(id: string): Promise<void> {
    const [sauvegarde, { logique, vue }] = await Promise.all([o.parties.lire(id), chargerJeu(id)]);
    if (sauvegarde === null) return fiche(id);
    const partie = depuisSauvegarde(logique, sauvegarde, maintenant(), estVisible(document));
    if (partie === null) {
      await o.parties.oublier(id);
      await informer('Partie illisible', 'La partie enregistrée ne peut pas être reprise. Elle a été supprimée.');
      return fiche(id);
    }
    ouvrirPartie(logique, vue, partie);
  }

  async function nouvelle(id: string, niveau: Niveau): Promise<void> {
    const depart = jeton;
    const enCours = await o.parties.lire(id);
    if (enCours !== null) {
      const { niveau: ancien, force } = enCours.puzzle.notation;
      const ok = await confirmer(
        'Remplacer la partie en cours ?',
        `Votre partie ${libelleForce(ancien, force)} (${formaterTemps(enCours.chronoMs)}) sera comptée comme abandonnée dans les statistiques.`,
        'Nouvelle partie',
      );
      if (!ok) return;
    }

    const demande = o.reserve.obtenirGrille(id, niveau);
    let preparation: DemandeEnCours | null = null;
    let annule = false;
    const chargement = afficherChargement('Préparation de la grille…', () => {
      annule = true;
      demande.annuler();
      preparation?.annuler();
    });
    const [resultat, jeu] = await Promise.all([demande.resultat, chargerJeu(id)]).catch((erreur: unknown) => {
      chargement.fermer();
      throw erreur;
    });
    if (resultat.statut !== 'ok') chargement.fermer();
    if (resultat.statut === 'annule') return;
    if (resultat.statut === 'erreur') {
      await informer('Grille indisponible', `Impossible de préparer une grille : ${resultat.message}`);
      return;
    }
    let { puzzle } = resultat;
    if (puzzle.jeu !== id || !jeu.logique.estDonnees(puzzle.donnees)) {
      chargement.fermer();
      await informer('Grille indisponible', 'La grille obtenue est invalide. Réessayez.');
      return;
    }

    // Réglages du jeu qui changent la grille (aide au départ…) : calculés dans le worker, sous le
    // même indicateur de chargement
    const meta = jeu.logique.meta;
    const valeurs = reglagesDuJeu(reglages, meta);
    if (preparationDemandee(meta.reglages, valeurs)) {
      preparation = o.preparer(puzzle, valeurs);
      const prepare = await preparation.resultat;
      if (annule || prepare.statut === 'annule') {
        chargement.fermer();
        return;
      }
      if (prepare.statut === 'ok' && prepare.puzzle.jeu === id && jeu.logique.estDonnees(prepare.puzzle.donnees)) {
        puzzle = { ...puzzle, donnees: prepare.puzzle.donnees };
      } else {
        console.error('Préparation impossible, grille jouée telle quelle :', prepare);
      }
    }
    chargement.fermer();
    // Le joueur est reparti ailleurs pendant le chargement (bouton retour) : on n'ouvre rien
    if (jeton !== depart) return;

    if (enCours !== null) await o.parties.abandonner(id);
    const instant = maintenant();
    const partie = nouvellePartie(jeu.logique, puzzle, instant, new Date(instant).toISOString(), estVisible(document));
    await o.parties.sauvegarder(versSauvegarde(jeu.logique, partie, instant, new Date(instant).toISOString()));
    ouvrirPartie(jeu.logique, jeu.vue, partie);
  }

  // Bouton « retour » d'Android (ou du navigateur), et boutons « ← » des écrans (history.back()) :
  // l'entrée d'historique atteinte dit à quelle profondeur remonter. Une entrée plus profonde que
  // l'écran courant (avancer, ou entrée restée d'avant un rechargement) est ignorée.
  // Au démarrage (y compris après un rechargement en pleine partie), on part de l'accueil.
  const etatDepart: EtatHistorique = { profondeur: 0 };
  history.replaceState(etatDepart, '');
  window.addEventListener('popstate', (evenement) => {
    const cible = profondeurHistorique(evenement.state);
    if (cible >= profondeur(courant)) return;
    void remonter(ancetre(courant, cible)).catch((erreur: unknown) => console.error(erreur));
  });

  void accueil();
  return { sauvegarder: () => partieOuverte?.sauvegarder() ?? Promise.resolve() };
}
