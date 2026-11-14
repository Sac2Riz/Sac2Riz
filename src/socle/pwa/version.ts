// VERSION DE L'APPLI affichée dans les réglages (section Application) : date et heure du build,
// puis le début de l'empreinte du contenu, ex. « 14/11/2026 17:30 · a1b2c3d4 ». Les infos viennent
// de version.json, écrit par le build (absent en développement : « Développement »).

import { estInfosVersion, FICHIER_VERSION, type InfosVersion } from '../../types/service-worker.ts';

/** Longueur de l'empreinte affichée (assez pour distinguer deux versions à l'œil). */
const LONGUEUR_EMPREINTE = 8;

/** Date et heure locales (celles de la tablette) : « 14/11/2026 17:30 ». Code pur. */
export function formaterDateBuild(date: Date): string {
  const deux = (n: number): string => String(n).padStart(2, '0');
  return `${deux(date.getDate())}/${deux(date.getMonth() + 1)}/${date.getFullYear()} ${deux(date.getHours())}:${deux(date.getMinutes())}`;
}

/** Texte affiché pour la version (null : pas de version.json, appli lancée par npm run dev). Code pur. */
export function texteVersion(infos: InfosVersion | null): string {
  if (infos === null) return 'Développement';
  return `${formaterDateBuild(new Date(infos.date))} · ${infos.version.slice(0, LONGUEUR_EMPREINTE)}`;
}

/** Lit version.json (depuis le cache du service worker hors ligne) ; null s'il manque ou est invalide. */
export async function lireVersion(charger: (url: URL) => Promise<unknown>, base: string): Promise<InfosVersion | null> {
  try {
    const valeur = await charger(new URL(`./${FICHIER_VERSION}`, base));
    return estInfosVersion(valeur) ? valeur : null;
  } catch {
    return null;
  }
}
