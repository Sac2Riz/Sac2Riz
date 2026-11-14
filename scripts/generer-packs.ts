// Génère les packs de grilles pré-générées : « npm run packs ».
// Options : --jeu=<id> (sudoku-classique, chiffres-cases ou tectonic ; tous par défaut),
//           --niveau=<id> (un seul niveau), --n=<nombre> grilles par pack (défaut 200).
// Graines 1, 2, 3… (reproductible). Une grille par ligne dans le JSON (diffs Git lisibles).
// À relancer dès que la version de notation d'un jeu change (sinon les tests des packs échouent).

import { estNiveau, type Niveau } from '../src/types/niveaux.ts';
import { argumentNombre } from './bench/outils.ts';
import { NIVEAUX_PACKS_CASES, packsChiffresCases } from './packs/chiffres-cases.ts';
import { NIVEAUX_PACKS_SUDOKU, packsSudoku } from './packs/sudoku-classique.ts';
import { NIVEAUX_PACKS_TECTONIC, packsTectonic } from './packs/tectonic.ts';

const nombre = argumentNombre('n', 200);

function argument(nom: string): string | null {
  const prefixe = `--${nom}=`;
  return process.argv.find((a) => a.startsWith(prefixe))?.slice(prefixe.length) ?? null;
}

const jeu = argument('jeu');
const niveau = argument('niveau');

function filtrer(niveaux: readonly Niveau[]): readonly Niveau[] {
  return niveau !== null && estNiveau(niveau) ? niveaux.filter((n) => n === niveau) : niveaux;
}

const JEUX: readonly { readonly id: string; readonly generer: () => void }[] = [
  { id: 'sudoku-classique', generer: () => packsSudoku(filtrer(NIVEAUX_PACKS_SUDOKU), nombre) },
  { id: 'chiffres-cases', generer: () => packsChiffresCases(filtrer(NIVEAUX_PACKS_CASES), nombre) },
  { id: 'tectonic', generer: () => packsTectonic(filtrer(NIVEAUX_PACKS_TECTONIC), nombre) },
];

if (jeu !== null && !JEUX.some((j) => j.id === jeu)) throw new Error(`Jeu inconnu : ${jeu}`);
for (const j of JEUX) {
  if (jeu !== null && j.id !== jeu) continue;
  console.log(`# ${j.id}`);
  j.generer();
}
