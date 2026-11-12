// Supprime dist/ pour repartir d'une compilation propre.
import { rmSync } from 'node:fs';
import { DOSSIER_DIST, estLanceDirectement } from './chemins.ts';

export function nettoyer(): void {
  rmSync(DOSSIER_DIST, { recursive: true, force: true });
}

if (estLanceDirectement(import.meta.url)) {
  nettoyer();
  console.log('dist/ supprimé.');
}
