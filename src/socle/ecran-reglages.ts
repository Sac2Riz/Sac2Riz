// ÉCRAN DES RÉGLAGES : fenêtre (<dialog>) ouverte depuis l'accueil ou pendant une partie.
// Chaque changement est appliqué tout de suite (changer() : thème, enregistrement, nouvel
// affichage de la grille) ; « Fermer », Échap ou le bouton retour d'Android ferment la fenêtre.

import type { Reglages, Theme } from '../types/sauvegarde.ts';
import { bouton, creer } from './dom.ts';
import { NOMS_THEMES, ORDRE_THEMES } from './theme.ts';

/** Réglages à interrupteur (vrai / faux), dans l'ordre d'affichage. */
const INTERRUPTEURS: readonly {
  readonly cle: 'verifierErreurs' | 'miseEnEvidence' | 'retraitAutoNotes';
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
    detail: 'Ligne, colonne et bloc de la case choisie, et chiffres identiques.',
  },
  {
    cle: 'retraitAutoNotes',
    titre: 'Retrait automatique des notes',
    detail: 'Poser un chiffre le retire des notes de sa ligne, de sa colonne et de son bloc.',
  },
];

function interrupteur(
  { cle, titre, detail }: (typeof INTERRUPTEURS)[number],
  lire: () => Reglages,
  changer: (r: Reglages) => void,
): HTMLElement {
  const ligne = creer('label', 'reglage');
  const textes = creer('span', 'reglage-textes');
  textes.append(creer('span', 'reglage-titre', titre), creer('span', 'reglage-detail', detail));
  const caseACocher = creer('input', 'reglage-interrupteur');
  caseACocher.type = 'checkbox';
  caseACocher.setAttribute('role', 'switch');
  caseACocher.checked = lire()[cle];
  caseACocher.addEventListener('change', () => changer({ ...lire(), [cle]: caseACocher.checked }));
  ligne.append(textes, caseACocher);
  return ligne;
}

function choixTheme(lire: () => Reglages, changer: (r: Reglages) => void): HTMLElement {
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
 * Ouvre la fenêtre des réglages ; se résout à sa fermeture.
 * lire() donne les réglages actuels, changer() applique et enregistre les nouveaux.
 */
export function ouvrirReglages(lire: () => Reglages, changer: (r: Reglages) => void): Promise<void> {
  const dialogue = creer('dialog', 'dialogue dialogue-reglages');
  const contenu = creer('div', 'dialogue-contenu');
  const fermer = bouton('bouton bouton-principal', 'Fermer', () => dialogue.close());
  const boutons = creer('div', 'dialogue-boutons');
  boutons.append(fermer);
  contenu.append(
    creer('h2', 'dialogue-titre', 'Réglages'),
    ...INTERRUPTEURS.map((i) => interrupteur(i, lire, changer)),
    choixTheme(lire, changer),
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
    fermer.focus();
  });
}
