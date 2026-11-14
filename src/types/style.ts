// STYLES DE L'APPLI (réglage « Style », Réglages → Application). Code pur.
// Un style = un attribut <html data-style="<id>"> + une feuille src/styles/visuels/<id>.css qui
// redéfinit les variables de src/styles/theme.css (couleurs, polices, formes), les icônes et les
// décors. Il se combine avec le thème Automatique / Clair / Sombre. Ardoise n'a pas de feuille : ses
// valeurs sont celles de theme.css.
// La liste est aussi écrite dans public/demarrage.js (application avant le premier affichage) :
// un test vérifie que les deux restent identiques.

/** Identifiants des styles, dans l'ordre du sélecteur (ordre alphabétique des noms). */
export const STYLES = ['ardoise', 'ascii', 'ascii-generatif', 'bbs-ansi', 'ms-dos', 'retro'] as const;

export type Style = (typeof STYLES)[number];

/** Style d'une nouvelle installation, et de réglages ou d'un fichier exporté qui n'en ont pas. */
export const STYLE_PAR_DEFAUT: Style = 'retro';

export const NOMS_STYLES: Readonly<Record<Style, string>> = {
  ardoise: 'Ardoise',
  ascii: 'ASCII',
  'ascii-generatif': 'ASCII génératif',
  'bbs-ansi': 'BBS ANSI',
  'ms-dos': 'MS-DOS',
  retro: 'Rétro',
};

export function estStyle(valeur: unknown): valeur is Style {
  // « as » sans risque : élargit le tableau (lecture seule) pour pouvoir y chercher une valeur quelconque
  return (STYLES as readonly unknown[]).includes(valeur);
}
