// SERVICE WORKER : fait fonctionner l'appli 100 % hors ligne.
//
// Un service worker est un script que le navigateur garde installé à côté du site ; il voit
// passer toutes les requêtes de la page et peut y répondre lui-même (ici : depuis un cache).
// Il est à la RACINE de l'appli (dist/service-worker.js) : sa « portée » couvre tout le site.
//
// Cycle de vie et mises à jour :
//  1. install  : tous les fichiers de la version sont mis en cache (« sac2riz-<version> »).
//                Si un seul échoue, l'installation est abandonnée et l'ancienne version reste.
//  2. attente  : une nouvelle version installée NE PREND PAS la main d'elle-même ; la page
//                affiche le bouton « Mettre à jour » et attend le feu vert du joueur.
//  3. message « activer » (« Mettre à jour » confirmé dans sa fenêtre) → skipWaiting() → activate : les caches des
//                anciennes versions sont supprimés ; la page se recharge sur la nouvelle version.
// Le service worker ne touche jamais à IndexedDB : parties, statistiques, réglages et réserve
// sont conservés d'une version à l'autre.
//
// La liste des fichiers et la version sont écrites dans le fichier compilé par
// scripts/manifeste-precache.ts (fin de « npm run build »), à la place du marqueur ci-dessous.
// En développement (npm run dev), le marqueur reste : rien n'est mis en cache, le réseau répond.

import { estManifestePrecache, PREFIXE_CACHE, type ManifestePrecache } from './types/service-worker.ts';

// Dans ce fichier, « self » est le service worker (la lib WebWorker le déclare plus largement)
declare const self: ServiceWorkerGlobalScope;

/** Remplacé au build par le manifeste en JSON ; garder ce texte exact, présent une seule fois. */
const MANIFESTE_TEXTE: string = '__MANIFESTE_PRECACHE__';

function lireManifeste(texte: string): ManifestePrecache | null {
  try {
    const valeur: unknown = JSON.parse(texte);
    return estManifestePrecache(valeur) ? valeur : null;
  } catch {
    return null; // marqueur non remplacé : mode développement
  }
}

const manifeste = lireManifeste(MANIFESTE_TEXTE);
const nomCache = manifeste === null ? null : `${PREFIXE_CACHE}${manifeste.version}`;

/** URL absolue d'un fichier de l'appli (relatif à la portée, ex. https://…/Sac2Riz/). */
function urlDe(fichier: string): string {
  return new URL(fichier, self.registration.scope).href;
}

async function mettreEnCache(): Promise<void> {
  if (manifeste === null || nomCache === null) return;
  const cache = await caches.open(nomCache);
  // cache: 'reload' : on contourne le cache HTTP du navigateur (GitHub Pages garde les fichiers
  // 10 min) pour ne jamais ranger un ancien fichier sous la nouvelle version
  await cache.addAll(manifeste.fichiers.map((f) => new Request(urlDe(f), { cache: 'reload' })));
}

async function supprimerAnciensCaches(): Promise<void> {
  const noms = await caches.keys();
  await Promise.all(noms.filter((n) => n.startsWith(PREFIXE_CACHE) && n !== nomCache).map((n) => caches.delete(n)));
}

async function repondre(requete: Request, cacheVersion: string): Promise<Response> {
  const cache = await caches.open(cacheVersion);
  const trouvee = await cache.match(requete, { ignoreSearch: true });
  if (trouvee !== undefined) return trouvee;
  // Une page (ex. l'adresse de l'appli, avec ou sans « index.html ») : toujours la page de l'appli
  if (requete.mode === 'navigate') {
    const page = await cache.match(urlDe('index.html'));
    if (page !== undefined) return page;
  }
  return fetch(requete);
}

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(mettreEnCache());
  // En développement, pas de mise à jour à proposer : la nouvelle version prend la main tout de suite
  if (manifeste === null) void self.skipWaiting();
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(supprimerAnciensCaches().then(() => self.clients.claim()));
});

self.addEventListener('message', (evenement) => {
  const donnees: unknown = evenement.data;
  if (typeof donnees === 'object' && donnees !== null && 'type' in donnees && donnees.type === 'activer') {
    void self.skipWaiting();
  }
});

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  if (nomCache === null || requete.method !== 'GET') return; // le navigateur fait la requête normalement
  if (new URL(requete.url).origin !== self.location.origin) return;
  evenement.respondWith(repondre(requete, nomCache));
});
