// DATE DU BUILD affichée dans les réglages (avec l'empreinte de version, voir manifeste-precache.ts).
//
// Elle doit être FIGÉE PAR LES SOURCES, pas par l'heure du build : deux builds au contenu identique
// doivent donner la même version, sinon le navigateur verrait une fausse « nouvelle version ».
// Règle :
//   - sources de l'appli toutes commitées → date du dernier commit qui a modifié l'une d'elles
//     (un commit qui ne touche que la doc ou les tests ne change donc ni la date ni la version) ;
//   - sources modifiées et pas encore commitées (build local) → date de modification la plus récente
//     de ces fichiers (stable tant qu'on ne les retouche pas) ;
//   - Git indisponible → heure du build (cas de secours).
// Dans GitHub Actions, le dépôt doit être récupéré avec tout son historique (fetch-depth: 0) : sinon
// Git ne voit que le dernier commit et la date changerait à chaque push.
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { RACINE } from './chemins.ts';

/** Fichiers et dossiers dont dépend le contenu de dist/ (chemins relatifs à la racine du projet). */
export const SOURCES_BUILD: readonly string[] = [
  'src',
  'public',
  'scripts/chemins.ts',
  'scripts/nettoyer.ts',
  'scripts/copier-statiques.ts',
  'scripts/manifeste-precache.ts',
  'scripts/date-build.ts',
  'tsconfig.json',
  'package-lock.json',
];

export type EtatSources = {
  /** Dates de modification (ms) des sources modifiées mais pas commitées (fichiers existants). */
  readonly modifications: readonly number[];
  /** Date ISO du dernier commit qui a touché les sources, ou null (pas de Git). */
  readonly dernierCommit: string | null;
};

/** Date du build (ISO 8601) selon la règle ci-dessus. Code pur. */
export function choisirDateBuild(etat: EtatSources, maintenant: Date): string {
  if (etat.modifications.length > 0) return new Date(Math.max(...etat.modifications)).toISOString();
  if (etat.dernierCommit !== null) return new Date(etat.dernierCommit).toISOString();
  return maintenant.toISOString();
}

function git(args: readonly string[]): string | null {
  try {
    return execFileSync('git', [...args], { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

/** Chemins des sources modifiées ou nouvelles d'après « git status --porcelain ». */
export function cheminsModifies(sortie: string): string[] {
  return sortie
    .split('\n')
    .filter((ligne) => ligne.length > 3)
    .map((ligne) => {
      const chemin = ligne.slice(3);
      const fleche = chemin.indexOf(' -> '); // fichier renommé : « ancien -> nouveau »
      return (fleche >= 0 ? chemin.slice(fleche + 4) : chemin).replace(/^"|"$/g, '');
    });
}

/** Lit l'état des sources dans le dépôt Git du projet. */
export function lireEtatSources(): EtatSources {
  const statut = git(['status', '--porcelain', '--untracked-files=all', '--', ...SOURCES_BUILD]);
  const modifications: number[] = [];
  for (const chemin of statut === null ? [] : cheminsModifies(statut)) {
    try {
      modifications.push(statSync(join(RACINE, chemin)).mtimeMs);
    } catch {
      // fichier supprimé : il n'a plus de date
    }
  }
  const commit = git(['log', '-1', '--format=%cI', '--', ...SOURCES_BUILD])?.trim() ?? '';
  return { modifications, dernierCommit: commit === '' ? null : commit };
}

export function dateBuild(maintenant = new Date()): string {
  return choisirDateBuild(lireEtatSources(), maintenant);
}
