// Petits utilitaires de construction de l'interface (DOM).

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

/** Bouton à icône : l'icône est décorative, le libellé est lu par les lecteurs d'écran. */
export function boutonIcone(classe: string, icone: string, libelle: string, action: () => void): HTMLButtonElement {
  const b = bouton(classe, '', action);
  b.setAttribute('aria-label', libelle);
  b.title = libelle;
  b.append(creer('span', 'icone', icone));
  return b;
}
