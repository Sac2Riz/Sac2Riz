// Petits utilitaires de construction de l'interface (DOM).

import type { NomIcone } from './icones.ts';

/** Crée un élément avec une classe et, éventuellement, un texte. */
export function creer<K extends keyof HTMLElementTagNameMap>(
  balise: K,
  classe: string,
  texte = '',
): HTMLElementTagNameMap[K] {
  const element = document.createElement(balise);
  element.className = classe;
  if (texte !== '') element.textContent = texte;
  return element;
}

/** Bouton (type « button », jamais « submit ») qui appelle action au toucher. */
export function bouton(classe: string, texte: string, action: () => void): HTMLButtonElement {
  const b = creer('button', classe, texte);
  b.type = 'button';
  b.addEventListener('click', action);
  return b;
}

/** Icône SVG décorative (le dessin dépend de la direction de design : voir icones.ts). */
export function icone(nom: NomIcone): HTMLSpanElement {
  const span = creer('span', 'icone');
  span.dataset['icone'] = nom;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

/** Change le dessin d'une icône déjà affichée (ex. pause ↔ reprendre). */
export function changerIcone(element: Element | null, nom: NomIcone): void {
  if (element instanceof HTMLElement) element.dataset['icone'] = nom;
}

/** Bouton à icône : l'icône est décorative, le libellé est lu par les lecteurs d'écran. */
export function boutonIcone(classe: string, nom: NomIcone, libelle: string, action: () => void): HTMLButtonElement {
  const b = bouton(classe, '', action);
  b.setAttribute('aria-label', libelle);
  b.title = libelle;
  b.append(icone(nom));
  return b;
}
