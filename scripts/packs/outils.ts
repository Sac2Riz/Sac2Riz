// Outils communs à la génération des packs (« npm run packs »).
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

/** Un pack : un en-tête et des grilles. */
type Pack = { readonly grilles: readonly object[] };

/** JSON compact, une grille par ligne (diffs Git lisibles). */
export function enJson(pack: Pack): string {
  const { grilles, ...entete } = pack;
  const debut = JSON.stringify(entete).slice(0, -1);
  const lignes = grilles.map((g) => JSON.stringify(g)).join(',\n');
  return `${debut},"grilles":[\n${lignes}\n]}\n`;
}

/**
 * Écrit le pack dans <dossier>/<niveau>.json après avoir vérifié qu'il passe la garde utilisée
 * à l'exécution (garde-fou : rien n'est écrit sinon), puis affiche un bilan.
 */
export function ecrirePack(
  dossier: string,
  niveau: string,
  pack: Pack,
  estValide: (v: unknown) => boolean,
  debutMs: number,
): void {
  const json = enJson(pack);
  if (!estValide(JSON.parse(json))) throw new Error(`Pack ${niveau} invalide : rien n'est écrit`);
  mkdirSync(dossier, { recursive: true });
  const fichier = join(dossier, `${niveau}.json`);
  writeFileSync(fichier, json);
  const octets = statSync(fichier).size;
  const secondes = (performance.now() - debutMs) / 1000;
  console.log(
    `${niveau.padEnd(10)} ${pack.grilles.length} grilles, ${(octets / 1024).toFixed(1)} Ko ` +
      `(${Math.round(octets / pack.grilles.length)} octets/grille), ${secondes.toFixed(1)} s`,
  );
}
