// Copie dans dist/ tout ce que tsc ne produit pas :
//  - le contenu de public/ (index.html, manifest, icônes) tel quel ;
//  - les fichiers non TypeScript de src/ (CSS, packs JSON, images), au même
//    chemin relatif que leurs modules .js (ex. src/games/x/style.css → dist/games/x/style.css).
// Les dossiers dont le nom commence par « _ » (ex. games/_modele) ne sont jamais copiés.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { DOSSIER_DIST, DOSSIER_PUBLIC, DOSSIER_SRC, estLanceDirectement } from './chemins.ts';

/** Extensions de src/ à copier (les .ts sont compilés par tsc, les .md ne sont pas publiés). */
const EXTENSIONS_SRC = new Set(['.css', '.json', '.svg', '.png', '.webp']);

/** Liste récursivement les fichiers d'un dossier, en ignorant les dossiers « _xxx ». */
function listerFichiers(dossier: string): string[] {
  const resultat: string[] = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) {
      if (!entree.name.startsWith('_')) resultat.push(...listerFichiers(chemin));
    } else if (entree.isFile()) {
      resultat.push(chemin);
    }
  }
  return resultat;
}

function copierFichier(source: string, base: string): void {
  const cible = join(DOSSIER_DIST, relative(base, source));
  mkdirSync(dirname(cible), { recursive: true });
  cpSync(source, cible);
}

/** Copie tous les fichiers statiques ; renvoie le nombre de fichiers copiés. */
export function copierStatiques(): number {
  let nombre = 0;
  if (existsSync(DOSSIER_PUBLIC)) {
    for (const fichier of listerFichiers(DOSSIER_PUBLIC)) {
      copierFichier(fichier, DOSSIER_PUBLIC);
      nombre++;
    }
  }
  for (const fichier of listerFichiers(DOSSIER_SRC)) {
    const estTsconfig = basename(fichier).startsWith('tsconfig');
    if (EXTENSIONS_SRC.has(extname(fichier)) && !estTsconfig) {
      copierFichier(fichier, DOSSIER_SRC);
      nombre++;
    }
  }
  return nombre;
}

if (estLanceDirectement(import.meta.url)) {
  const nombre = copierStatiques();
  console.log(`${nombre} fichier(s) statique(s) copié(s) dans dist/.`);
}
