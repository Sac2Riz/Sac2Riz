// Écran d'accueil (version minimale de l'étape 0) : titre et liste des jeux.
// À venir (étape 3) : bouton « Continuer », choix de la difficulté, statistiques, réglages.

import type { ModuleJeuQuelconque } from '../types/vue.ts';

/** Petit utilitaire : crée un élément avec une classe et un texte. */
function creer<K extends keyof HTMLElementTagNameMap>(
  balise: K,
  classe: string,
  texte = '',
): HTMLElementTagNameMap[K] {
  const element = document.createElement(balise);
  element.className = classe;
  element.textContent = texte;
  return element;
}

export function afficherAccueil(conteneur: HTMLElement, jeux: readonly ModuleJeuQuelconque[]): void {
  const entete = creer('header', 'accueil-entete');
  entete.append(creer('h1', 'accueil-titre', 'Sac2Riz'), creer('p', 'accueil-sous-titre', 'Jeux de logique à chiffres'));

  const liste = creer('section', 'accueil-jeux');
  liste.setAttribute('aria-label', 'Jeux disponibles');
  if (jeux.length === 0) {
    liste.append(creer('p', 'accueil-vide', 'Aucun jeu disponible pour l\'instant.'));
  }
  for (const jeu of jeux) {
    const carte = creer('button', 'carte-jeu');
    carte.type = 'button';
    carte.append(creer('span', 'carte-jeu-nom', jeu.meta.nom), creer('span', 'carte-jeu-description', jeu.meta.description));
    liste.append(carte);
  }

  conteneur.replaceChildren(entete, liste);
}
