// Mode développement : « npm run dev ».
//  1. repart d'un dist/ propre et copie les fichiers statiques ;
//  2. lance tsc en mode surveillance (appli + worker) : chaque .ts modifié est recompilé ;
//  3. surveille public/ et src/ : chaque fichier statique modifié est recopié ;
//  4. démarre le serveur local.
// Après une modification, il suffit de recharger la page dans le navigateur.
// Arrêt : Ctrl+C dans le terminal.
// Options transmises au serveur : npm run dev -- --reseau   (ou --port 9000)
import { spawn, type ChildProcess } from 'node:child_process';
import { watch } from 'node:fs';
import { join } from 'node:path';
import { DOSSIER_PUBLIC, DOSSIER_SRC, RACINE } from './chemins.ts';
import { copierStatiques } from './copier-statiques.ts';
import { nettoyer } from './nettoyer.ts';
import { demarrerServeur, lireOptions } from './serveur.ts';

// On lance tsc via Node directement : plus fiable sous Windows que la commande « tsc.cmd ».
const TSC = join(RACINE, 'node_modules', 'typescript', 'bin', 'tsc');
const CONFIGS = ['tsconfig.json', join('src', 'worker', 'tsconfig.json')];

nettoyer();
copierStatiques();

const processus: ChildProcess[] = CONFIGS.map((config) =>
  spawn(process.execPath, [TSC, '-p', config, '--watch', '--preserveWatchOutput'], {
    cwd: RACINE,
    stdio: 'inherit',
  }),
);

// Recopie des fichiers statiques, regroupée si plusieurs changements arrivent d'un coup
let minuterie: ReturnType<typeof setTimeout> | undefined;
function planifierCopie(fichier: string | null): void {
  if (fichier !== null && fichier.endsWith('.ts')) return; // déjà géré par tsc
  clearTimeout(minuterie);
  minuterie = setTimeout(() => {
    const nombre = copierStatiques();
    console.log(`[statiques] ${nombre} fichier(s) recopié(s).`);
  }, 150);
}
watch(DOSSIER_PUBLIC, { recursive: true }, (_evenement, fichier) => planifierCopie(fichier));
watch(DOSSIER_SRC, { recursive: true }, (_evenement, fichier) => planifierCopie(fichier));

demarrerServeur(lireOptions(process.argv.slice(2)));

process.on('SIGINT', () => {
  for (const p of processus) p.kill();
  process.exit(0);
});
