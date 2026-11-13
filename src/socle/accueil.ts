// ÉCRAN D'ACCUEIL : pour chaque jeu, le bouton « Continuer » (s'il y a une partie en cours)
// et le choix du niveau pour une nouvelle partie. L'écran ne décide de rien : il appelle les
// actions fournies par l'appli (app.ts), qui gère confirmation, chargement et navigation.

import { INFOS_NIVEAUX, type Niveau } from '../types/niveaux.ts';
import type { PartieSauvegardee, Theme } from '../types/sauvegarde.ts';
import type { ModuleJeuQuelconque } from '../types/vue.ts';
import { bouton, creer } from './dom.ts';
import { etoiles, formaterTemps } from './format.ts';
import { NOMS_THEMES } from './theme.ts';

export type JeuAccueil = {
  readonly module: ModuleJeuQuelconque;
  /** Partie en cours sur ce jeu, ou null. */
  readonly partie: PartieSauvegardee | null;
};

export type ActionsAccueil = {
  readonly continuer: (jeu: string) => void;
  readonly nouvelle: (jeu: string, niveau: Niveau) => void;
  /** Thème actuel (pour le bouton « Thème »). */
  readonly theme: Theme;
  /** Passe au thème suivant, l'applique, l'enregistre et le renvoie. */
  readonly changerTheme: () => Theme;
};

/** Bouton « Thème : Automatique / Clair / Sombre » de l'en-tête. */
function boutonTheme(actions: ActionsAccueil): HTMLButtonElement {
  const valeur = creer('span', 'bouton-theme-valeur', NOMS_THEMES[actions.theme]);
  const b = bouton('bouton bouton-theme', '', () => {
    valeur.textContent = NOMS_THEMES[actions.changerTheme()];
  });
  b.setAttribute('aria-label', 'Changer de thème (automatique, clair ou sombre)');
  b.append(creer('span', 'icone', '◐'), creer('span', 'bouton-theme-libelle', 'Thème :'), valeur);
  return b;
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
    boutonTheme(actions),
  );

  const liste = creer('div', 'accueil-jeux');
  if (jeux.length === 0) liste.append(creer('p', 'accueil-vide', 'Aucun jeu disponible pour l\'instant.'));
  for (const jeu of jeux) liste.append(carteJeu(jeu, actions));

  accueil.append(entete, liste);
  conteneur.replaceChildren(accueil);
}
