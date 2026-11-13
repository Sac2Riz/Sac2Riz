// ÉCRAN D'ACCUEIL : pour chaque jeu, le bouton « Continuer » (s'il y a une partie en cours)
// et le choix du niveau pour une nouvelle partie ; en haut, « Statistiques » et « Réglages ». L'écran ne décide de rien : il appelle les
// actions fournies par l'appli (app.ts), qui gère confirmation, chargement et navigation.

import { INFOS_NIVEAUX, type Niveau } from '../types/niveaux.ts';
import type { PartieSauvegardee } from '../types/sauvegarde.ts';
import type { ModuleJeuQuelconque } from '../types/vue.ts';
import { bouton, creer } from './dom.ts';
import { etoiles, formaterTemps } from './format.ts';

export type JeuAccueil = {
  readonly module: ModuleJeuQuelconque;
  /** Partie en cours sur ce jeu, ou null. */
  readonly partie: PartieSauvegardee | null;
};

export type ActionsAccueil = {
  readonly continuer: (jeu: string) => void;
  readonly nouvelle: (jeu: string, niveau: Niveau) => void;
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

function carteJeu({ module, partie }: JeuAccueil, actions: ActionsAccueil): HTMLElement {
  const { meta } = module;
  const carte = creer('section', 'carte-jeu');
  carte.setAttribute('aria-labelledby', `jeu-${meta.id}`);
  const titre = creer('h2', 'carte-jeu-nom', meta.nom);
  titre.id = `jeu-${meta.id}`;
  carte.append(titre, creer('p', 'carte-jeu-description', meta.description));

  if (partie !== null) {
    const niveau = partie.puzzle.notation.niveau;
    const continuer = bouton('bouton bouton-principal bouton-continuer', '', () => actions.continuer(meta.id));
    continuer.append(
      creer('span', 'bouton-continuer-titre', 'Continuer'),
      creer('span', 'bouton-continuer-detail', `${INFOS_NIVEAUX[niveau].nom} · ${formaterTemps(partie.chronoMs)}`),
    );
    carte.append(continuer);
  }

  carte.append(creer('h3', 'carte-jeu-sous-titre', 'Nouvelle partie'));
  const niveaux = creer('div', 'choix-niveaux');
  for (const niveau of meta.niveaux) {
    const b = bouton(`bouton bouton-niveau niveau-${niveau}`, '', () => actions.nouvelle(meta.id, niveau));
    const nomNiveau = INFOS_NIVEAUX[niveau].nom;
    b.setAttribute('aria-label', `Nouvelle partie, niveau ${nomNiveau}`);
    b.append(creer('span', 'bouton-niveau-nom', nomNiveau), creer('span', 'bouton-niveau-etoiles', etoiles(niveau)));
    niveaux.append(b);
  }
  carte.append(niveaux);
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
