// ÉCRAN D'ACCUEIL : les jeux en GRILLE DE CARTES (autant de colonnes que la largeur le permet :
// 3 en paysage sur tablette, 2 en portrait, 1 sur un écran très étroit). Chaque carte montre un petit
// aperçu du jeu en lecture seule (la partie en cours, sinon la grille d'exemple, dessiné ensuite par
// l'appli avec VueJeu.apercu), le nom, la description courte et la pastille « Partie en cours ».
// Toute la carte se touche : elle ouvre la fiche du jeu (ecran-fiche.ts).
// En haut, « Statistiques » (tous les jeux), « Mettre à jour » (seulement quand une nouvelle version
// est prête) et « Réglages ». L'écran ne décide de rien : il appelle
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
  /** Bouton « Mettre à jour » (visible seulement quand une nouvelle version est prête). */
  readonly boutonMiseAJour: () => HTMLElement;
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
  nav.append(lien('📊', 'Statistiques', actions.statistiques), actions.boutonMiseAJour(), lien('⚙', 'Réglages', actions.reglages));
  return nav;
}

/**
 * Carte d'un jeu. Un seul bouton, invisible, couvre toute la carte (l'aperçu peut contenir des
 * boutons de cases : on ne met pas de bouton dans un bouton). Renvoie la carte et la zone de l'aperçu.
 */
function carteJeu({ module, partie }: JeuAccueil, actions: ActionsAccueil): { carte: HTMLElement; apercu: HTMLElement } {
  const { meta } = module;
  const carte = creer('article', 'carte-jeu carte-accueil');

  const apercu = creer('div', 'carte-accueil-apercu');
  apercu.inert = true; // image de la grille : ni toucher ni clavier (la carte entière est le bouton)
  apercu.setAttribute('aria-hidden', 'true');

  const entete = creer('div', 'carte-jeu-entete');
  entete.append(creer('h2', 'carte-jeu-nom', meta.nom));
  if (partie !== null) entete.append(creer('span', 'pastille-en-cours', 'Partie en cours'));

  const toucher = bouton('carte-accueil-toucher', '', () => actions.ouvrir(meta.id));
  toucher.setAttribute('aria-label', `${meta.nom}${partie !== null ? ', partie en cours' : ''}. ${meta.description}`);

  carte.append(apercu, entete, creer('p', 'carte-jeu-description', meta.description), toucher);
  return { carte, apercu };
}

/**
 * Affiche l'accueil ; renvoie la zone d'aperçu de chaque jeu (clé = id), que l'appli remplit dès que
 * la vue et la fiche du jeu sont chargées (l'accueil s'affiche sans les attendre).
 */
export function afficherAccueil(
  conteneur: HTMLElement,
  jeux: readonly JeuAccueil[],
  actions: ActionsAccueil,
): ReadonlyMap<string, HTMLElement> {
  const accueil = creer('div', 'accueil');
  const entete = creer('header', 'accueil-entete');
  entete.append(
    creer('h1', 'accueil-titre', 'Sac2Riz'),
    creer('p', 'accueil-sous-titre', 'Jeux de logique à chiffres'),
    menu(actions),
  );

  const liste = creer('div', 'accueil-jeux');
  const apercus = new Map<string, HTMLElement>();
  if (jeux.length === 0) liste.append(creer('p', 'accueil-vide', 'Aucun jeu disponible pour l\'instant.'));
  for (const jeu of jeux) {
    const { carte, apercu } = carteJeu(jeu, actions);
    apercus.set(jeu.module.meta.id, apercu);
    liste.append(carte);
  }

  accueil.append(entete, liste);
  conteneur.replaceChildren(accueil);
  return apercus;
}
