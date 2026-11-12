// Application du thème clair/sombre.
// Par défaut (« systeme »), le CSS suit le réglage de la tablette (prefers-color-scheme) ;
// sinon l'attribut data-theme sur <html> force le thème choisi.

import type { Theme } from '../types/sauvegarde.ts';

export function appliquerTheme(theme: Theme): void {
  const racine = document.documentElement;
  if (theme === 'systeme') {
    delete racine.dataset['theme'];
  } else {
    racine.dataset['theme'] = theme;
  }
}
