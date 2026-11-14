// Thème clair/sombre.
// Par défaut (« systeme »), le CSS suit le réglage de la tablette (prefers-color-scheme) ;
// sinon l'attribut data-theme sur <html> force le thème choisi (voir src/styles/theme.css).
// Le choix se fait dans l'écran des réglages et est enregistré avec eux (appliqué avec le style :
// style/appliquer.ts).

import type { Theme } from '../types/sauvegarde.ts';

/** Ordre des choix de thème dans l'écran des réglages. */
export const ORDRE_THEMES: readonly Theme[] = ['systeme', 'clair', 'sombre'];

export const NOMS_THEMES: Readonly<Record<Theme, string>> = {
  systeme: 'Automatique',
  clair: 'Clair',
  sombre: 'Sombre',
};

/**
 * Couleur de la barre d'état d'Android = fond de l'appli tel qu'il est affiché (il dépend du thème ET
 * du style) : lu sur <body>, déjà calculé par le navigateur. Les deux balises
 * theme-color d'index.html (une par thème du système) prennent la couleur affichée.
 */
export function mettreAJourCouleurBarre(): void {
  const couleur = getComputedStyle(document.body).backgroundColor;
  if (couleur === '') return;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = couleur;
}

let suiviSysteme = false;

export function appliquerTheme(theme: Theme): void {
  const racine = document.documentElement;
  if (theme === 'systeme') {
    delete racine.dataset['theme'];
  } else {
    racine.dataset['theme'] = theme;
  }
  mettreAJourCouleurBarre();
  // En automatique, le fond change quand la tablette passe en clair ou en sombre
  if (!suiviSysteme) {
    suiviSysteme = true;
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', mettreAJourCouleurBarre);
  }
}
