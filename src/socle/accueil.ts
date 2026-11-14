// ÉCRAN D'ACCUEIL : la liste des jeux (nom, description courte, pastille « Partie en cours ») ;
// toucher un jeu ouvre sa fiche (ecran-fiche.ts), d'où l'on reprend ou commence une partie.
// En haut, « Statistiques » (tous les jeux) et « Réglages ». L'écran ne décide de rien : il appelle
// les actions fournies par l'appli (app.ts).

import type { PartieSauvegardee } from '../types/sauvegarde.ts';
import type { ModuleJeuQuelconque } from '../types/vue.ts';
import { bouton, creer } from './dom.ts';

export type JeuAccueil = {
  readonly module: ModuleJeuQuelconque;
  /** Partie en cours sur ce jeu, ou null. */
  readonly partie: PartieSauvegardee | null;
};

export type ActionsAccueil = {
  readonly ouvrir: (jeu: string) => void;
  readonly statistiques: () => void;
  readonly reglages: () => void;
};

/** Boutons « Statistiques » et « Réglages » de l'en-tête. */
function menu(actions: ActionsAccueil): HTMLElement {
  const nav = creer('nav', 'accueil-menu');
  nav.setAttribute('aria-label', 'Menu');
  const lien = (icone: string, libelle: string, action: () => void): HTMLButtonElement => {
    const b = bouton('bouton bouton-menu', '', action);
    b.append(creer('span', 'icone', icone), creer('span', '', libelle));
    return b;
  };
  nav.append(lien('📊', 'Statistiques', actions.statistiques), lien('⚙', 'Réglages', actions.reglages));
  return nav;
}

/** Carte d'un jeu : un seul grand bouton qui ouvre sa fiche. */
function carteJeu({ module, partie }: JeuAccueil, actions: ActionsAccueil): HTMLElement {
  const { meta } = module;
  const carte = bouton('carte-jeu carte-jeu-bouton', '', () => actions.ouvrir(meta.id));
  const entete = creer('span', 'carte-jeu-entete');
  entete.append(creer('span', 'carte-jeu-nom', meta.nom));
  if (partie !== null) entete.append(creer('span', 'pastille-en-cours', 'Partie en cours'));
  carte.append(entete, creer('span', 'carte-jeu-description', meta.description), creer('span', 'carte-jeu-fleche', '›'));
  carte.setAttribute('aria-label', `${meta.nom}${partie !== null ? ', partie en cours' : ''}. ${meta.description}`);
  return carte;
}

export function afficherAccueil(conteneur: HTMLElement, jeux: readonly JeuAccueil[], actions: ActionsAccueil): void {
  const accueil = creer('div', 'accueil');
  const entete = creer('header', 'accueil-entete');
  entete.append(
    creer('h1', 'accueil-titre', 'Sac2Riz'),
    creer('p', 'accueil-sous-titre', 'Jeux de logique à chiffres'),
    menu(actions),
  );

  const liste = creer('div', 'accueil-jeux');
  if (jeux.length === 0) liste.append(creer('p', 'accueil-vide', 'Aucun jeu disponible pour l\'instant.'));
  for (const jeu of jeux) liste.append(carteJeu(jeu, actions));

  accueil.append(entete, liste);
  conteneur.replaceChildren(accueil);
}
