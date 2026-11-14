// Dernière étape de « npm run build » : écrit dans dist/service-worker.js la liste des fichiers
// à mettre en cache et la version de l'appli (voir src/service-worker.ts).
//  - fichiers : tout dist/, sauf les cartes de source (*.map, utiles seulement pour déboguer)
//    et le service worker lui-même (le navigateur le gère à part) ; les packs des jeux en font partie ;
//  - version : empreinte SHA-256 du contenu de tous les fichiers de dist/ (service worker compris).
//    Elle change dès qu'un fichier change, et seulement dans ce cas : pas besoin d'y penser,
//    et pas de fausse « nouvelle version » quand on relance un build identique.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { ManifestePrecache } from '../src/types/service-worker.ts';
import { DOSSIER_DIST, estLanceDirectement } from './chemins.ts';

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

/** Calcule le manifeste d'un dossier construit (dist/). */
export function construireManifeste(dossier: string): ManifestePrecache {
  const tous = listerRelatifs(dossier).filter((f) => !f.endsWith('.map'));
  const empreinte = createHash('sha256');
  for (const fichier of tous) {
    empreinte.update(fichier);
    empreinte.update('\0');
    empreinte.update(readFileSync(join(dossier, fichier)));
    empreinte.update('\0');
  }
  return {
    version: empreinte.digest('hex').slice(0, 12),
    fichiers: tous.filter((f) => f !== FICHIER_SERVICE_WORKER),
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

/** Écrit le manifeste dans le service worker du dossier ; renvoie le manifeste. */
export function ecrireManifeste(dossier = DOSSIER_DIST): ManifestePrecache {
  const manifeste = construireManifeste(dossier);
  const chemin = join(dossier, FICHIER_SERVICE_WORKER);
  writeFileSync(chemin, injecterManifeste(readFileSync(chemin, 'utf8'), manifeste));
  return manifeste;
}

if (estLanceDirectement(import.meta.url)) {
  const { version, fichiers } = ecrireManifeste();
  console.log(`Service worker : version ${version}, ${fichiers.length} fichier(s) mis en cache.`);
}
