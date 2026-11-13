// Thème clair/sombre.
// Par défaut (« systeme »), le CSS suit le réglage de la tablette (prefers-color-scheme) ;
// sinon l'attribut data-theme sur <html> force le thème choisi (voir src/styles/theme.css).
// Le choix se fait dans l'écran des réglages et est enregistré avec eux.

import type { Theme } from '../types/sauvegarde.ts';

/** Ordre des choix de thème dans l'écran des réglages. */
export const ORDRE_THEMES: readonly Theme[] = ['systeme', 'clair', 'sombre'];

export const NOMS_THEMES: Readonly<Record<Theme, string>> = {
  systeme: 'Automatique',
  clair: 'Clair',
  sombre: 'Sombre',
};

/** Couleur de la barre d'état d'Android (= --couleur-fond de theme.css). */
const COULEUR_BARRE = { clair: '#eef1f4', sombre: '#151a21' } as const;

export function appliquerTheme(theme: Theme): void {
  const racine = document.documentElement;
  if (theme === 'systeme') {
    delete racine.dataset['theme'];
  } else {
    racine.dataset['theme'] = theme;
  }
  // index.html déclare une couleur de barre par thème du système (attribut media) : si le thème
  // est forcé, les deux prennent sa couleur, sinon chacune retrouve la sienne.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const pourSombre = meta.media.includes('dark');
    meta.content = theme === 'systeme' ? COULEUR_BARRE[pourSombre ? 'sombre' : 'clair'] : COULEUR_BARRE[theme];
  }
}
