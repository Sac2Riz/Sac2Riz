// ÉCRAN DES RÉGLAGES : fenêtre (<dialog>) ouverte depuis l'accueil, la fiche d'un jeu ou une partie.
// Trois sections clairement séparées (étape 6a) :
//   1. Application : style, thème, sauvegarde
//      (export / import), version de l'appli ;
//   2. Tous les jeux : vérification des erreurs, mise en évidence ;
//   3. Par jeu : une sous-section par jeu avec SES réglages, déclarés par le jeu (MetaJeu.reglages)
//      et affichés automatiquement ; pendant une partie, seulement le jeu en cours.
// Chaque changement est appliqué tout de suite (changer() : style et thème, enregistrement, nouvel affichage
// de la grille) ; « Fermer », Échap ou le bouton retour d'Android ferment la fenêtre.
// Import : seulement hors d'une partie (l'écran de partie sauvegarde la partie en cours et
// écraserait celle qui vient d'être importée).

import type { MetaJeu, ReglageJeu } from '../types/jeu.ts';
import type { Reglages, Theme } from '../types/sauvegarde.ts';
import { NOMS_STYLES, STYLES, type Style } from '../types/style.ts';
import { estActif } from '../utils/reglages-jeu.ts';
import { bouton, creer } from './dom.ts';
import { changerReglageJeu, reglagesDuJeu } from './reglages.ts';
import { NOMS_THEMES, ORDRE_THEMES } from './theme.ts';

type Lire = () => Reglages;
type Changer = (r: Reglages) => void;

/** Réglages communs à tous les jeux (interrupteurs), dans l'ordre d'affichage. */
const COMMUNS: readonly {
  readonly cle: 'verifierErreurs' | 'miseEnEvidence';
  readonly titre: string;
  readonly detail: string;
}[] = [
  {
    cle: 'verifierErreurs',
    titre: 'Vérification des erreurs',
    detail: 'Les chiffres faux sont signalés en rouge (comparaison avec la solution).',
  },
  {
    cle: 'miseEnEvidence',
    titre: 'Mise en évidence',
    detail: 'Met en valeur ce qui est lié à la case choisie (au sudoku : sa ligne, sa colonne, son bloc et les chiffres identiques).',
  },
];

/** Une ligne « titre + explication + interrupteur ». */
function interrupteur(titre: string, detail: string, valeur: () => boolean, ecrire: (v: boolean) => void): HTMLElement {
  const ligne = creer('label', 'reglage');
  const textes = creer('span', 'reglage-textes');
  textes.append(creer('span', 'reglage-titre', titre), creer('span', 'reglage-detail', detail));
  const caseACocher = creer('input', 'reglage-interrupteur');
  caseACocher.type = 'checkbox';
  caseACocher.setAttribute('role', 'switch');
  caseACocher.checked = valeur();
  caseACocher.addEventListener('change', () => ecrire(caseACocher.checked));
  ligne.append(textes, caseACocher);
  return ligne;
}

function choixTheme(lire: Lire, changer: Changer): HTMLElement {
  const groupe = creer('div', 'reglage reglage-theme');
  const titre = creer('span', 'reglage-titre', 'Thème');
  titre.id = 'reglage-theme-titre';
  const choix = creer('div', 'choix-theme');
  choix.setAttribute('role', 'radiogroup');
  choix.setAttribute('aria-labelledby', titre.id);
  const boutons = new Map<Theme, HTMLButtonElement>();
  const marquer = (): void => {
    for (const [theme, b] of boutons) b.setAttribute('aria-checked', String(lire().theme === theme));
  };
  for (const theme of ORDRE_THEMES) {
    const b = bouton('bouton choix-theme-bouton', NOMS_THEMES[theme], () => {
      changer({ ...lire(), theme });
      marquer();
    });
    b.setAttribute('role', 'radio');
    boutons.set(theme, b);
    choix.append(b);
  }
  marquer();
  groupe.append(titre, choix);
  return groupe;
}

/**
 * Pastille d'aperçu d'un style : elle porte data-style, donc les variables de ce style (couleurs,
 * polices : voir src/styles/visuels/) ; « Aa » dans sa police de titre, un chiffre saisi, ses couleurs.
 * Elle suit le thème clair / sombre en cours.
 */
function apercuStyle(style: Style): HTMLElement {
  const apercu = creer('span', 'apercu-style');
  apercu.dataset['style'] = style;
  apercu.setAttribute('aria-hidden', 'true');
  const texte = creer('span', 'apercu-style-texte', 'Aa');
  texte.append(creer('span', 'apercu-style-chiffre', '7'));
  const couleurs = creer('span', 'apercu-style-couleurs');
  for (let i = 0; i < 4; i++) couleurs.append(creer('span', ''));
  apercu.append(texte, couleurs);
  return apercu;
}

/** Choix du style : une option par style (aperçu + nom), appliqué tout de suite et enregistré. */
function choixStyle(lire: Lire, changer: Changer): HTMLElement {
  const groupe = creer('div', 'reglage reglage-style');
  const titre = creer('span', 'reglage-titre', 'Style');
  titre.id = 'reglage-style-titre';
  const choix = creer('div', 'choix-style');
  choix.setAttribute('role', 'radiogroup');
  choix.setAttribute('aria-labelledby', titre.id);
  const boutons = new Map<Style, HTMLButtonElement>();
  const marquer = (): void => {
    for (const [style, b] of boutons) b.setAttribute('aria-checked', String(lire().style === style));
  };
  for (const style of STYLES) {
    const b = bouton('bouton choix-theme-bouton choix-style-bouton', '', () => {
      changer({ ...lire(), style });
      marquer();
    });
    b.append(apercuStyle(style), creer('span', 'choix-style-nom', NOMS_STYLES[style]));
    b.setAttribute('role', 'radio');
    boutons.set(style, b);
    choix.append(b);
  }
  marquer();
  groupe.append(titre, choix);
  return groupe;
}

/** Export et import des données (socle/donnees/actions-donnees.ts). */
export type SauvegardeReglages = {
  readonly exporter: () => Promise<void>;
  /** null : import indisponible ici (fenêtre ouverte pendant une partie). */
  readonly importer: ((fichier: File) => Promise<void>) | null;
};

function sauvegarde({ exporter, importer }: SauvegardeReglages): HTMLElement {
  const groupe = creer('div', 'reglage reglage-sauvegarde');
  const textes = creer('span', 'reglage-textes');
  textes.append(
    creer('span', 'reglage-titre', 'Sauvegarde'),
    creer(
      'span',
      'reglage-detail',
      importer === null
        ? 'Exporter toutes vos données dans un fichier. L\'import se fait en dehors d\'une partie.'
        : 'Exporter toutes vos données dans un fichier, ou les remplacer par un fichier exporté.',
    ),
  );
  const boutons = creer('div', 'reglage-sauvegarde-boutons');
  // Un toucher à la fois : un second export ou import attend la fin du premier
  let occupe = false;
  const uneFois = (action: () => Promise<void>): void => {
    if (occupe) return;
    occupe = true;
    void action().finally(() => {
      occupe = false;
    });
  };
  boutons.append(bouton('bouton', 'Exporter', () => uneFois(exporter)));
  if (importer !== null) {
    const choix = creer('input', 'reglage-fichier');
    choix.type = 'file';
    choix.accept = '.json,application/json';
    choix.hidden = true;
    choix.addEventListener('change', () => {
      const fichier = choix.files?.[0];
      choix.value = ''; // le même fichier pourra être choisi à nouveau
      if (fichier !== undefined) uneFois(() => importer(fichier));
    });
    boutons.append(bouton('bouton', 'Importer', () => choix.click()), choix);
  }
  groupe.append(textes, boutons);
  return groupe;
}

/** Version de l'appli : texte affiché dès qu'il est connu (lecture de version.json). */
function version(texte: Promise<string>): HTMLElement {
  const ligne = creer('div', 'reglage reglage-version');
  const valeur = creer('span', 'reglage-valeur', '…');
  ligne.append(creer('span', 'reglage-titre', 'Version'), valeur);
  void texte.then((t) => {
    valeur.textContent = t;
  });
  return ligne;
}

/** Section à titre (Application, Tous les jeux, Par jeu). */
function section(id: string, titre: string, ...contenu: HTMLElement[]): HTMLElement {
  const s = creer('section', 'reglages-section');
  const h = creer('h3', 'reglages-section-titre', titre);
  h.id = `reglages-${id}`;
  s.setAttribute('aria-labelledby', h.id);
  s.append(h, ...contenu);
  return s;
}

function reglageJeu(meta: MetaJeu, reglage: ReglageJeu, lire: Lire, changer: Changer): HTMLElement {
  return interrupteur(
    reglage.libelle,
    reglage.detail,
    () => estActif(reglagesDuJeu(lire(), meta), reglage),
    (v) => changer(changerReglageJeu(lire(), meta.id, reglage.id, v)),
  );
}

/** Sous-section d'un jeu : ses réglages déclarés, ou une phrase s'il n'en a aucun. */
function sousSectionJeu(meta: MetaJeu, lire: Lire, changer: Changer): HTMLElement {
  const bloc = creer('div', 'reglages-jeu');
  bloc.append(creer('h4', 'reglages-jeu-nom', meta.nom));
  if (meta.reglages.length === 0) bloc.append(creer('p', 'reglage-detail reglages-jeu-vide', 'Aucun réglage propre à ce jeu.'));
  for (const r of meta.reglages) bloc.append(reglageJeu(meta, r, lire, changer));
  return bloc;
}

export type OptionsReglages = {
  readonly sauvegarde: SauvegardeReglages;
  /** Version de l'appli, déjà mise en forme (« 14/11/2026 17:30 · a1b2c3d4 »). */
  readonly version: Promise<string>;
  /** Jeux de la section « Par jeu » (pendant une partie : le jeu en cours seulement). */
  readonly jeux: readonly MetaJeu[];
};

/**
 * Ouvre la fenêtre des réglages ; se résout à sa fermeture.
 * lire() donne les réglages actuels, changer() applique et enregistre les nouveaux.
 */
export function ouvrirReglages(lire: Lire, changer: Changer, o: OptionsReglages): Promise<void> {
  const dialogue = creer('dialog', 'dialogue dialogue-reglages');
  const contenu = creer('div', 'dialogue-contenu');
  const fermer = bouton('bouton bouton-principal', 'Fermer', () => dialogue.close());
  const boutons = creer('div', 'dialogue-boutons');
  boutons.append(fermer);
  contenu.append(
    creer('h2', 'dialogue-titre', 'Réglages'),
    section(
      'application',
      'Application',
      choixStyle(lire, changer),
      choixTheme(lire, changer),
      sauvegarde(o.sauvegarde),
      version(o.version),
    ),
    section(
      'communs',
      'Tous les jeux',
      ...COMMUNS.map(({ cle, titre, detail }) =>
        interrupteur(titre, detail, () => lire()[cle], (v) => changer({ ...lire(), [cle]: v })),
      ),
    ),
    section('jeux', 'Par jeu', ...o.jeux.map((meta) => sousSectionJeu(meta, lire, changer))),
    boutons,
  );
  dialogue.append(contenu);
  document.body.append(dialogue);
  return new Promise((resoudre) => {
    dialogue.addEventListener('close', () => {
      dialogue.remove();
      resoudre();
    });
    dialogue.showModal();
    // Fenêtre ouverte en haut (sections dans l'ordre) : le focus sur « Fermer », en bas, ne la fait pas défiler
    fermer.focus({ preventScroll: true });
    dialogue.scrollTop = 0;
  });
}
