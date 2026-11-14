// CE QUE MONTRE LA FENÊTRE DE MISE À JOUR : version installée, nouvelle version (date et heure de
// chacune) et nouveautés apportées depuis la version installée. Code pur (le cache du navigateur est
// décrit par une petite interface, remplacée par un faux dans les tests).
//
// La nouvelle version est DÉJÀ téléchargée : son service worker l'a mise dans le cache
// « sac2riz-<version> ». On y lit son version.json et son nouveautes.json : tout marche hors ligne.
// Nouveautés à montrer = groupes du fichier de la nouvelle version absents de celui de la version
// installée (plusieurs versions publiées depuis : toutes leurs nouveautés, de la plus récente à la
// plus ancienne ; version sans nouveauté visible : rien).

import { estFichierNouveautes, FICHIER_NOUVEAUTES, type FichierNouveautes, type GroupeNouveautes } from '../../types/nouveautes.ts';
import { estInfosVersion, FICHIER_VERSION, PREFIXE_CACHE, type InfosVersion } from '../../types/service-worker.ts';

/** Accès en lecture aux caches des versions de l'appli (Cache Storage du navigateur). */
export interface LecteurCaches {
  /** Noms de tous les caches. */
  noms(): Promise<readonly string[]>;
  /** Contenu JSON du fichier (URL absolue) dans ce cache, ou null s'il n'y est pas. */
  lireJson(nomCache: string, url: string): Promise<unknown>;
}

export type InfosMiseAJour = {
  /** Version installée (celle qui tourne), ou null si inconnue. */
  readonly actuelle: InfosVersion | null;
  /** Version téléchargée qui attend le feu vert du joueur, ou null si introuvable. */
  readonly nouvelle: InfosVersion | null;
  /** Groupes de nouveautés à montrer, du plus récent au plus ancien ([] : rien de visible). */
  readonly nouveautes: readonly GroupeNouveautes[];
};

/**
 * Nouveautés de la nouvelle version que la version installée n'avait pas, dans l'ordre du fichier
 * (du plus récent au plus ancien). Sans fichier pour la version installée : toutes.
 */
export function nouveautesDepuis(nouveau: FichierNouveautes, installe: FichierNouveautes | null): GroupeNouveautes[] {
  const connus = new Set(installe?.versions.map((g) => g.id) ?? []);
  return nouveau.versions.filter((g) => !connus.has(g.id));
}

type Candidate = { readonly cache: string; readonly infos: InfosVersion };

/** La version la plus récente parmi les caches autres que celui de la version installée. */
async function trouverNouvelle(caches: LecteurCaches, base: string, actuelle: InfosVersion | null): Promise<Candidate | null> {
  const cacheActuel = actuelle === null ? null : `${PREFIXE_CACHE}${actuelle.version}`;
  const noms = (await caches.noms()).filter((n) => n.startsWith(PREFIXE_CACHE) && n !== cacheActuel);
  const url = new URL(`./${FICHIER_VERSION}`, base).href;
  let meilleure: Candidate | null = null;
  for (const cache of noms) {
    const infos = await caches.lireJson(cache, url).catch(() => null);
    if (!estInfosVersion(infos) || infos.version === actuelle?.version) continue;
    if (meilleure === null || Date.parse(infos.date) > Date.parse(meilleure.infos.date)) meilleure = { cache, infos };
  }
  return meilleure;
}

export async function lireInfosMiseAJour(o: {
  readonly caches: LecteurCaches;
  /** Adresse de la page (document.baseURI) : les fichiers sont rangés sous leur URL absolue. */
  readonly base: string;
  readonly actuelle: InfosVersion | null;
  readonly nouveautesActuelles: FichierNouveautes | null;
}): Promise<InfosMiseAJour> {
  const trouvee = await trouverNouvelle(o.caches, o.base, o.actuelle).catch(() => null);
  if (trouvee === null) return { actuelle: o.actuelle, nouvelle: null, nouveautes: [] };
  const fichier = await o.caches.lireJson(trouvee.cache, new URL(`./${FICHIER_NOUVEAUTES}`, o.base).href).catch(() => null);
  const nouveautes = estFichierNouveautes(fichier) ? nouveautesDepuis(fichier, o.nouveautesActuelles) : [];
  return { actuelle: o.actuelle, nouvelle: trouvee.infos, nouveautes };
}

/** Lecteur réel : Cache Storage du navigateur (rempli par le service worker). */
export function lecteurCachesNavigateur(stockage: CacheStorage): LecteurCaches {
  return {
    noms: () => stockage.keys(),
    lireJson: async (nomCache, url) => {
      const cache = await stockage.open(nomCache);
      const reponse = await cache.match(url);
      if (reponse === undefined) return null;
      const valeur: unknown = await reponse.json();
      return valeur;
    },
  };
}
