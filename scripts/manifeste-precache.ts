// Dernière étape de « npm run build » : écrit dans dist/service-worker.js la liste des fichiers
// à mettre en cache et la version de l'appli (voir src/service-worker.ts), et dist/version.json
// (version et date du build, affichées dans les réglages).
//  - fichiers : tout dist/, sauf les cartes de source (*.map, utiles seulement pour déboguer)
//    et le service worker lui-même (le navigateur le gère à part) ; les packs des jeux et
//    version.json en font partie ;
//  - date : date du build FIGÉE PAR LES SOURCES (scripts/date-build.ts), pas l'heure du build ;
//  - version : empreinte SHA-256 du contenu de tous les fichiers de dist/ (service worker compris,
//    version.json non compris puisqu'il en découle) et de la date.
//    Elle change dès qu'un fichier change, et seulement dans ce cas : pas besoin d'y penser,
//    et pas de fausse « nouvelle version » quand on relance un build identique.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { FICHIER_VERSION, type InfosVersion, type ManifestePrecache } from '../src/types/service-worker.ts';
import { DOSSIER_DIST, estLanceDirectement } from './chemins.ts';
import { dateBuild } from './date-build.ts';

export const FICHIER_SERVICE_WORKER = 'service-worker.js';
/** Marqueur écrit dans src/service-worker.ts, remplacé ici par le manifeste. */
const MARQUEUR = /(['"])__MANIFESTE_PRECACHE__\1/g;

/** Tous les fichiers du dossier, en chemins relatifs avec des « / », triés. */
function listerRelatifs(dossier: string, base = dossier): string[] {
  const resultat: string[] = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) resultat.push(...listerRelatifs(chemin, base));
    else if (entree.isFile()) resultat.push(relative(base, chemin).split(sep).join('/'));
  }
  return resultat.sort();
}

/** Calcule le manifeste d'un dossier construit (dist/) pour une date de build (ISO 8601). */
export function construireManifeste(dossier: string, date: string): ManifestePrecache {
  const tous = listerRelatifs(dossier).filter((f) => !f.endsWith('.map') && f !== FICHIER_VERSION);
  const empreinte = createHash('sha256');
  empreinte.update(date);
  empreinte.update('\0');
  for (const fichier of tous) {
    empreinte.update(fichier);
    empreinte.update('\0');
    empreinte.update(readFileSync(join(dossier, fichier)));
    empreinte.update('\0');
  }
  return {
    version: empreinte.digest('hex').slice(0, 12),
    fichiers: [...tous.filter((f) => f !== FICHIER_SERVICE_WORKER), FICHIER_VERSION].sort(),
  };
}

/** Remplace le marqueur (présent exactement une fois) par le manifeste en texte JSON. */
export function injecterManifeste(source: string, manifeste: ManifestePrecache): string {
  const occurrences = source.match(MARQUEUR)?.length ?? 0;
  if (occurrences !== 1) {
    throw new Error(`${FICHIER_SERVICE_WORKER} : marqueur du manifeste trouvé ${occurrences} fois (1 attendu).`);
  }
  // Fonction de remplacement : un « $ » dans le texte ne serait pas interprété
  return source.replace(MARQUEUR, () => JSON.stringify(JSON.stringify(manifeste)));
}

/**
 * Écrit version.json et le manifeste dans le service worker du dossier ; renvoie le manifeste.
 * date : date du build (ISO 8601) ; par défaut, celle des sources (date-build.ts).
 */
export function ecrireManifeste(dossier = DOSSIER_DIST, date = dateBuild()): ManifestePrecache {
  const manifeste = construireManifeste(dossier, date);
  const infos: InfosVersion = { version: manifeste.version, date };
  writeFileSync(join(dossier, FICHIER_VERSION), `${JSON.stringify(infos)}\n`);
  const chemin = join(dossier, FICHIER_SERVICE_WORKER);
  writeFileSync(chemin, injecterManifeste(readFileSync(chemin, 'utf8'), manifeste));
  return manifeste;
}

if (estLanceDirectement(import.meta.url)) {
  const date = dateBuild();
  const { version, fichiers } = ecrireManifeste(DOSSIER_DIST, date);
  console.log(`Service worker : version ${version} (build du ${date}), ${fichiers.length} fichier(s) mis en cache.`);
}
