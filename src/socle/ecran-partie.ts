// ÉCRAN DE PARTIE (commun à tous les jeux) : barre du haut (retour, niveau, chrono, réglages,
// pause), grille du jeu (sa vue), outils (notes, effacer, annuler, rétablir, indice) et pavé commun
// (une touche est estompée quand sa valeur ne peut plus être posée).
//
// L'état de la partie est une valeur « Partie » (partie.ts, code pur) remplacée à chaque
// changement ; après chaque action, elle est redessinée et SAUVEGARDÉE.
// Chrono : pause automatique quand l'appli passe en arrière-plan (visibilitychange), pause
// manuelle avec le bouton (la grille est alors masquée).
// Indice en deux temps : 1) la grille met en évidence le motif et un bandeau (à la place du pavé)
// donne la technique et son explication — le compteur d'indices augmente dès ce moment ;
// 2) « Appliquer » joue l'action de l'indice (annulable). Toute autre action ferme le bandeau.
// Clavier physique : chiffres, Retour arrière/Suppr (effacer), N (notes), Ctrl+Z / Ctrl+Y.

import type { Indice } from '../types/jeu.ts';
import type { Json } from '../types/json.ts';
import { INFOS_NIVEAUX } from '../types/niveaux.ts';
import type { Reglages } from '../types/sauvegarde.ts';
import type { ContexteVue, VueJeu } from '../types/vue.ts';
import type { BilanFin } from './bilan-fin.ts';
import { boutonIcone, bouton, creer } from './dom.ts';
import { etoiles, formaterTemps } from './format.ts';
import {
  annuler,
  changerPause,
  changerVisibilitePartie,
  compterIndice,
  jouer,
  peutAnnulerPartie,
  peutRetablirPartie,
  retablir,
  tempsMs,
  versSauvegarde,
  type Logique,
  type Partie,
} from './partie.ts';
import type { BilanRecord, ServiceParties } from './service-parties.ts';
import { estVisible, surveillerVisibilite } from './visibilite.ts';

export type OptionsEcranPartie = {
  readonly conteneur: HTMLElement;
  readonly logique: Logique;
  readonly vue: VueJeu<Json, Json, Json>;
  readonly partie: Partie;
  /** Réglages actuels (ils peuvent changer pendant la partie). */
  readonly reglages: () => Reglages;
  /** Ouvre l'écran des réglages ; se résout à sa fermeture. */
  readonly ouvrirReglages: () => Promise<void>;
  readonly parties: ServiceParties;
  /** Retour à l'accueil (appelé après la dernière sauvegarde). */
  readonly quitter: () => void;
  /** Grille terminée (statistiques déjà enregistrées) : affiche l'écran de fin. */
  readonly finir: (bilan: BilanFin) => void;
  /** Horloge en millisecondes (Date.now). */
  readonly maintenant: () => number;
};

/** Écran affiché ; quitter() sauvegarde, libère tout et retourne à l'accueil. */
export type EcranPartie = { readonly quitter: () => Promise<void> };

const RAFRAICHISSEMENT_CHRONO_MS = 250;
/** Pause entre la dernière case remplie et l'écran de fin (on voit la grille complète). */
const DELAI_FIN_MS = 600;

export function afficherPartie(o: OptionsEcranPartie): EcranPartie {
  const { logique, vue } = o;
  let partie = o.partie;
  let modeNotes = false;
  let ferme = false;
  /** Indice montré (1er temps), ou null. */
  let indice: Indice<Json> | null = null;
  const niveau = partie.puzzle.notation.niveau;

  // ---------- Construction de l'écran ----------
  const ecran = creer('div', 'partie');

  const barre = creer('header', 'partie-barre');
  const retour = boutonIcone('bouton-icone', '←', 'Retour à l\'accueil', () => void quitter());
  const titre = creer('div', 'partie-titre');
  titre.append(creer('span', 'partie-niveau', INFOS_NIVEAUX[niveau].nom), creer('span', 'partie-etoiles', etoiles(niveau)));
  const chrono = creer('span', 'partie-chrono');
  chrono.setAttribute('role', 'timer');
  const reglages = boutonIcone('bouton-icone', '⚙', 'Réglages', () => void ouvrirReglages());
  const pause = boutonIcone('bouton-icone', '❙❙', 'Mettre en pause', () => basculerPause());
  barre.append(retour, titre, chrono, reglages, pause);

  const zoneGrille = creer('div', 'partie-grille');
  const voilePause = creer('div', 'partie-pause');
  voilePause.append(creer('p', 'partie-pause-texte', 'Pause'), bouton('bouton bouton-principal', 'Reprendre', () => basculerPause()));

  const outils = creer('div', 'partie-outils');
  const outilNotes = outil('✎', 'Notes', () => {
    modeNotes = !modeNotes;
    dessiner();
  });
  const outilEffacer = outil('⌫', 'Effacer', () => instance.effacer());
  const outilAnnuler = outil('↶', 'Annuler', () => changer(annuler(logique, partie)));
  const outilRetablir = outil('↷', 'Rétablir', () => changer(retablir(logique, partie)));
  const outilIndice = outil('💡', 'Indice', () => montrerIndice());
  const compteurIndices = creer('small', 'outil-compteur');
  outilIndice.append(compteurIndices);
  outils.append(outilNotes, outilEffacer, outilAnnuler, outilRetablir, outilIndice);

  const pave = creer('div', 'partie-pave');
  const touches = new Map<string, HTMLButtonElement>();
  if (vue.pave.type === 'commun') {
    for (const valeur of vue.pave.valeurs) {
      const touche = bouton('touche', '', () => saisir(valeur));
      touche.append(creer('span', 'touche-valeur', valeur));
      touches.set(valeur, touche);
      pave.append(touche);
    }
  }

  // Bandeau de l'indice (1er temps) : à la place du pavé
  const bandeau = creer('section', 'partie-indice');
  bandeau.setAttribute('aria-live', 'polite');
  bandeau.setAttribute('aria-labelledby', 'partie-indice-titre');
  const bandeauTitre = creer('h2', 'partie-indice-titre');
  bandeauTitre.id = 'partie-indice-titre';
  const bandeauTexte = creer('p', 'partie-indice-texte');
  const appliquer = bouton('bouton bouton-principal', '', () => appliquerIndice());
  const fermerIndice = bouton('bouton bouton-secondaire', 'Fermer', () => {
    indice = null;
    dessiner();
  });
  const bandeauBoutons = creer('div', 'partie-indice-boutons');
  bandeauBoutons.append(fermerIndice, appliquer);
  bandeau.append(bandeauTitre, bandeauTexte, bandeauBoutons);

  // Ordre du DOM = ordre de lecture ; la disposition portrait/paysage est faite en CSS (grid-template-areas)
  ecran.append(barre, zoneGrille, outils, pave, bandeau);
  o.conteneur.replaceChildren(ecran);

  const contexte: ContexteVue<Json> = {
    jouer: (action) => changer(jouer(logique, partie, action, o.maintenant())),
    reglages: o.reglages,
    modeNotes: () => modeNotes,
  };
  const instance = vue.monter(zoneGrille, contexte);
  zoneGrille.append(voilePause);

  function outil(icone: string, libelle: string, action: () => void): HTMLButtonElement {
    const b = bouton('outil', '', action);
    b.append(creer('span', 'icone', icone), creer('span', 'outil-libelle', libelle));
    return b;
  }

  // ---------- Affichage ----------
  function enPause(): boolean {
    return partie.chrono.pauseManuelle;
  }

  function dessinerChrono(): void {
    chrono.textContent = formaterTemps(tempsMs(partie, o.maintenant()));
  }

  function dessinerIndice(): void {
    ecran.classList.toggle('avec-indice', indice !== null);
    if (indice === null) return;
    bandeauTitre.textContent = `💡 ${indice.titre}`;
    bandeauTexte.textContent = indice.explication;
    appliquer.textContent = indice.libelleAction;
  }

  function dessiner(): void {
    const { etat } = partie;
    const donnees = partie.puzzle.donnees;
    const erreurs = o.reglages().verifierErreurs ? logique.erreurs(etat, donnees) : [];
    instance.afficher({ etat, donnees, erreurs, indice: indice === null ? null : indice.marques });

    // Touche estompée quand sa valeur ne peut plus être posée (aucun nombre affiché)
    const restants = vue.restants(etat, donnees);
    for (const [valeur, touche] of touches) {
      const epuisee = restants !== null && (restants[valeur] ?? 0) === 0;
      touche.classList.toggle('est-epuisee', epuisee);
      touche.setAttribute('aria-label', epuisee ? `${valeur}, déjà posé partout` : valeur);
    }

    const bloque = enPause() || partie.terminee;
    outilNotes.setAttribute('aria-pressed', String(modeNotes));
    outilNotes.classList.toggle('est-actif', modeNotes);
    outilNotes.disabled = bloque;
    outilEffacer.disabled = bloque;
    outilAnnuler.disabled = bloque || !peutAnnulerPartie(partie);
    outilRetablir.disabled = bloque || !peutRetablirPartie(partie);
    outilIndice.disabled = bloque;
    outilIndice.classList.toggle('est-actif', indice !== null);
    const n = partie.indicesUtilises;
    compteurIndices.textContent = n > 0 ? String(n) : '';
    outilIndice.setAttribute('aria-label', n > 0 ? `Indice (${n} utilisé${n > 1 ? 's' : ''})` : 'Indice');
    for (const touche of touches.values()) touche.disabled = bloque;
    pause.disabled = partie.terminee;
    pause.setAttribute('aria-label', enPause() ? 'Reprendre' : 'Mettre en pause');
    pause.title = pause.getAttribute('aria-label') ?? '';
    const iconePause = pause.querySelector('.icone');
    if (iconePause !== null) iconePause.textContent = enPause() ? '▶' : '❙❙';
    ecran.classList.toggle('est-en-pause', enPause());
    ecran.classList.toggle('mode-notes', modeNotes);
    dessinerIndice();
    dessinerChrono();
  }

  // ---------- Sauvegarde ----------
  function sauvegarder(): Promise<void> {
    if (partie.terminee) return Promise.resolve(); // une partie finie n'est plus « en cours »
    const maintenant = o.maintenant();
    return o.parties
      .sauvegarder(versSauvegarde(logique, partie, maintenant, new Date(maintenant).toISOString()))
      .catch((erreur: unknown) => console.error('Sauvegarde impossible :', erreur));
  }

  // ---------- Changements ----------
  function changer(suivante: Partie): void {
    if (ferme || suivante === partie) return;
    const finie = !partie.terminee && suivante.terminee;
    partie = suivante;
    indice = null; // la grille a changé : l'indice affiché n'est plus d'actualité
    dessiner();
    if (finie) void finir();
    else void sauvegarder();
  }

  function saisir(valeur: string): void {
    if (!enPause() && !partie.terminee) instance.saisir(valeur);
  }

  function basculerPause(): void {
    if (partie.terminee) return;
    partie = changerPause(partie, !enPause(), o.maintenant());
    dessiner();
    void sauvegarder();
  }

  /** 1er temps : montre l'indice et compte-le (même s'il n'est pas appliqué ensuite). */
  function montrerIndice(): void {
    if (enPause() || partie.terminee) return;
    if (indice !== null) {
      indice = null; // second toucher sur « Indice » : referme le bandeau
      dessiner();
      return;
    }
    const trouve = logique.indice(partie.etat, partie.puzzle.donnees, { retraitAutoNotes: o.reglages().retraitAutoNotes });
    if (trouve === null) return;
    partie = compterIndice(partie);
    indice = trouve;
    dessiner();
    void sauvegarder();
  }

  /** 2e temps : joue l'action de l'indice (un coup comme un autre : annulable). */
  function appliquerIndice(): void {
    if (indice === null) return;
    const { action } = indice;
    indice = null;
    const suivante = jouer(logique, partie, action, o.maintenant());
    if (suivante === partie) dessiner();
    else changer(suivante);
  }

  async function ouvrirReglages(): Promise<void> {
    await o.ouvrirReglages();
    if (!ferme) dessiner(); // vérification des erreurs, mise en évidence… pris en compte tout de suite
  }

  async function finir(): Promise<void> {
    const temps = tempsMs(partie, o.maintenant());
    const { notation } = partie.puzzle;
    let record: BilanRecord = { nouveauRecord: false, ancienRecordMs: null };
    try {
      record = await o.parties.terminer({
        jeu: partie.puzzle.jeu,
        niveau,
        tempsMs: temps,
        force: notation.force,
        indicesUtilises: partie.indicesUtilises,
      });
    } catch (erreur) {
      console.error('Statistiques non enregistrées :', erreur);
    }
    // Laisse voir un instant la grille complète avant l'écran de fin
    await new Promise((r) => setTimeout(r, DELAI_FIN_MS));
    if (ferme) return; // le joueur est déjà reparti vers l'accueil (statistiques enregistrées)
    liberer();
    o.finir({
      jeu: partie.puzzle.jeu,
      niveau,
      force: notation.force,
      tempsMs: temps,
      technique: logique.nomTechnique(notation.techniqueMax),
      indicesUtilises: partie.indicesUtilises,
      ...record,
    });
  }

  // ---------- Événements ----------
  const minuterie = setInterval(dessinerChrono, RAFRAICHISSEMENT_CHRONO_MS);

  const arreterVisibilite = surveillerVisibilite(document, (visible) => {
    partie = changerVisibilitePartie(partie, visible, o.maintenant());
    dessiner();
    // En arrière-plan, Android peut fermer l'appli à tout moment : on sauvegarde tout de suite
    if (!visible) void sauvegarder();
  });

  function auClavier(evenement: KeyboardEvent): void {
    if (document.querySelector('dialog[open]') !== null || evenement.altKey || evenement.metaKey) return;
    const touche = evenement.key;
    const ctrl = evenement.ctrlKey;
    if (ctrl && (touche === 'z' || touche === 'Z')) {
      evenement.preventDefault();
      if (evenement.shiftKey) outilRetablir.click();
      else outilAnnuler.click();
    } else if (ctrl && (touche === 'y' || touche === 'Y')) {
      evenement.preventDefault();
      outilRetablir.click();
    } else if (ctrl) {
      return;
    } else if (touches.has(touche)) {
      evenement.preventDefault();
      saisir(touche);
    } else if (touche === 'Backspace' || touche === 'Delete') {
      evenement.preventDefault();
      outilEffacer.click();
    } else if (touche === 'n' || touche === 'N') {
      outilNotes.click();
    }
  }
  document.addEventListener('keydown', auClavier);

  /** Arrête minuterie et écouteurs, retire la vue. */
  function liberer(): void {
    if (ferme) return;
    ferme = true;
    clearInterval(minuterie);
    arreterVisibilite();
    document.removeEventListener('keydown', auClavier);
    instance.detruire();
  }

  let enSortie = false;
  async function quitter(): Promise<void> {
    if (ferme || enSortie) return;
    enSortie = true;
    // Fige le chrono à l'instant du départ (la sauvegarde ne compte plus le temps passé hors de la partie)
    partie = changerVisibilitePartie(partie, false, o.maintenant());
    await sauvegarder();
    liberer();
    o.quitter();
  }

  // Reprise alors que l'appli est en arrière-plan (rare) : le chrono part arrêté
  partie = changerVisibilitePartie(partie, estVisible(document), o.maintenant());
  dessiner();
  void sauvegarder();
  return { quitter };
}
