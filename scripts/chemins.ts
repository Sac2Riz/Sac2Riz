// Chemins du projet, calculés à partir de l'emplacement de ce fichier
// (aucun chemin absolu écrit en dur), et petit utilitaire commun aux scripts.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Racine du projet (dossier parent de scripts/). */
export const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DOSSIER_SRC = join(RACINE, 'src');
export const DOSSIER_PUBLIC = join(RACINE, 'public');
export const DOSSIER_DIST = join(RACINE, 'dist');

/**
 * Vrai si le module dont on passe l'URL (import.meta.url) est le script lancé
 * en ligne de commande (« node scripts/x.ts »), faux s'il est seulement importé.
 */
export function estLanceDirectement(urlModule: string): boolean {
  const lance = process.argv[1];
  return lance !== undefined && resolve(lance) === fileURLToPath(urlModule);
}
