// Types partagés entre la page et le service worker (code pur : ni DOM, ni Node).

import { estObjet, estTableauDe } from '../utils/gardes-json.ts';

/**
 * Liste des fichiers mis en cache et version, écrite dans dist/service-worker.js par
 * scripts/manifeste-precache.ts à la fin de « npm run build ».
 */
export type ManifestePrecache = {
  /** Empreinte du contenu de tous les fichiers : change dès qu'un fichier change. */
  readonly version: string;
  /** Chemins relatifs à la racine de l'appli (ex. « index.html », « games/x/packs/expert.json »). */
  readonly fichiers: readonly string[];
};

/** Message de la page vers le service worker en attente : « prends la main » (clic sur Recharger). */
export type MessageVersServiceWorker = { readonly type: 'activer' };

/** Préfixe des caches de l'appli (un cache par version : « sac2riz-<version> »). */
export const PREFIXE_CACHE = 'sac2riz-';

/** Garde de type du manifeste (relu par le service worker). */
export function estManifestePrecache(valeur: unknown): valeur is ManifestePrecache {
  if (!estObjet(valeur)) return false;
  const { version, fichiers } = valeur;
  const estChemin = (f: unknown): f is string => typeof f === 'string' && f.length > 0;
  return typeof version === 'string' && version.length > 0 && estTableauDe(fichiers, estChemin);
}
