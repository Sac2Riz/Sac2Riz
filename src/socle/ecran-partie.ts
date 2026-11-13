// ÉCRAN DE PARTIE (commun à tous les jeux) : barre du haut (retour, niveau, chrono, pause),
// grille du jeu (sa vue), outils (notes, effacer, annuler, rétablir) et pavé commun.
//
// L'état de la partie est une valeur « Partie » (partie.ts, code pur) remplacée à chaque
// changement ; après chaque action, elle est redessinée et SAUVEGARDÉE.
// Chrono : pause automatique quand l'appli passe en arrière-plan (visibilitychange), pause
// manuelle avec le bouton (la grille est alors masquée).
// Clavier physique : chiffres, Retour arrière/Suppr (effacer), N (notes), Ctrl+Z / Ctrl+Y.

import type { Json } from '../types/json.ts';
import { INFOS_NIVEAUX } from '../types/niveaux.ts';
import type { Reglages } from '../types/sauvegarde.ts';
import type { ContexteVue, VueJeu } from '../types/vue.ts';
import { informer } from './dialogue.ts';
import { boutonIcone, bouton, creer } from './dom.ts';
import { etoiles, formaterTemps } from './format.ts';
import {
  annuler,
  changerPause,
  changerVisibilitePartie,
  jouer,
  peutAnnulerPartie,
  peutRetablirPartie,
  retablir,
  tempsMs,
  versSauvegarde,
  type Logique,
  type Partie,
} from './partie.ts';
import type { ServiceParties } from './service-parties.ts';
import { estVisible, surveillerVisibilite } from './visibilite.ts';

export type OptionsEcranPartie = {
  readonly conteneur: HTMLElement;
  readonly logique: Logique;
  readonly vue: VueJeu<Json, Json, Json>;
  readonly partie: Partie;
  readonly reglages: Reglages;
  readonly parties: ServiceParties;
  /** Retour à l'accueil (appelé après la dernière sauvegarde). */
  readonly quitter: () => void;
  /** Horloge en millisecondes (Date.now). */
  readonly maintenant: () => number;
};

/** Écran affiché ; quitter() sauvegarde, libère tout et retourne à l'accueil. */
export type EcranPartie = { readonly quitter: () => Promise<void> };

const RAFRAICHISSEMENT_CHRONO_MS = 250;

export function afficherPartie(o: OptionsEcranPartie): EcranPartie {
  const { logique, vue } = o;
  let partie = o.partie;
  let modeNotes = false;
  let ferme = false;
  const niveau = partie.puzzle.notation.niveau;

  // ---------- Construction de l'écran ----------
  const ecran = creer('div', 'partie');

  const barre = creer('header', 'partie-barre');
  const retour = boutonIcone('bouton-icone', '←', 'Retour à l\'accueil', () => void quitter());
  const titre = creer('div', 'partie-titre');
  titre.append(creer('span', 'partie-niveau', INFOS_NIVEAUX[niveau].nom), creer('span', 'partie-etoiles', etoiles(niveau)));
  const chrono = creer('span', 'partie-chrono');
  chrono.setAttribute('role', 'timer');
  const pause = boutonIcone('bouton-icone', '❙❙', 'Mettre en pause', () => basculerPause());
  barre.append(retour, titre, chrono, pause);

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
  outils.append(outilNotes, outilEffacer, outilAnnuler, outilRetablir);

  const pave = creer('div', 'partie-pave');
  const touches = new Map<string, { bouton: HTMLButtonElement; reste: HTMLElement }>();
  if (vue.pave.type === 'commun') {
    for (const valeur of vue.pave.valeurs) {
      const touche = bouton('touche', '', () => saisir(valeur));
      const reste = creer('small', 'touche-reste');
      touche.append(creer('span', 'touche-valeur', valeur), reste);
      touches.set(valeur, { bouton: touche, reste });
      pave.append(touche);
    }
  }

  // Ordre du DOM = ordre de lecture ; la disposition portrait/paysage est faite en CSS (grid-template-areas)
  ecran.append(barre, zoneGrille, outils, pave);
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

  function dessiner(): void {
    const { etat } = partie;
    const donnees = partie.puzzle.donnees;
    const erreurs = o.reglages.verifierErreurs ? logique.erreurs(etat, donnees) : [];
    instance.afficher(etat, donnees, erreurs);

    const restants = vue.restants(etat, donnees);
    for (const [valeur, { bouton: touche, reste }] of touches) {
      const n = restants === null ? null : (restants[valeur] ?? 0);
      reste.textContent = n === null ? '' : String(n);
      touche.classList.toggle('est-epuisee', n === 0);
      touche.setAttribute('aria-label', n === null ? valeur : `${valeur}, encore ${n}`);
    }

    const bloque = enPause() || partie.terminee;
    outilNotes.setAttribute('aria-pressed', String(modeNotes));
    outilNotes.classList.toggle('est-actif', modeNotes);
    outilNotes.disabled = bloque;
    outilEffacer.disabled = bloque;
    outilAnnuler.disabled = bloque || !peutAnnulerPartie(partie);
    outilRetablir.disabled = bloque || !peutRetablirPartie(partie);
    for (const { bouton: touche } of touches.values()) touche.disabled = bloque;
    pause.disabled = partie.terminee;
    pause.setAttribute('aria-label', enPause() ? 'Reprendre' : 'Mettre en pause');
    pause.title = pause.getAttribute('aria-label') ?? '';
    const iconePause = pause.querySelector('.icone');
    if (iconePause !== null) iconePause.textContent = enPause() ? '▶' : '❙❙';
    ecran.classList.toggle('est-en-pause', enPause());
    ecran.classList.toggle('mode-notes', modeNotes);
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

  async function finir(): Promise<void> {
    const temps = tempsMs(partie, o.maintenant());
    try {
      await o.parties.terminer(partie.puzzle.jeu, niveau, temps, partie.puzzle.notation.force);
    } catch (erreur) {
      console.error('Statistiques non enregistrées :', erreur);
    }
    await informer('Bravo !', `Grille ${INFOS_NIVEAUX[niveau].nom} terminée en ${formaterTemps(temps)}.`, 'Retour à l\'accueil');
    await quitter();
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

  async function quitter(): Promise<void> {
    if (ferme) return;
    ferme = true;
    clearInterval(minuterie);
    arreterVisibilite();
    document.removeEventListener('keydown', auClavier);
    // Fige le chrono à l'instant du départ (la sauvegarde ne compte plus le temps passé hors de la partie)
    partie = changerVisibilitePartie(partie, false, o.maintenant());
    await sauvegarder();
    instance.detruire();
    o.quitter();
  }

  // Reprise alors que l'appli est en arrière-plan (rare) : le chrono part arrêté
  partie = changerVisibilitePartie(partie, estVisible(document), o.maintenant());
  dessiner();
  void sauvegarder();
  return { quitter };
}
