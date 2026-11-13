// Génère les packs de grilles pré-générées du sudoku classique : « npm run packs ».
// Option : --n=<nombre> grilles par pack (défaut 200).
// Graines 1, 2, 3… (reproductible) ; une graine dont la génération échoue est sautée.
// Écrit src/games/sudoku-classique/packs/<niveau>.json, une grille par ligne (diffs Git lisibles).
// À relancer dès que VERSION_NOTATION change (sinon les tests des packs échouent).

import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { genererParNiveau } from '../src/moteur/generation-niveau.ts';
import { estPackSudoku, grilleEnTexte } from '../src/moteur/pack.ts';
import { VERSION_NOTATION } from '../src/moteur/notation.ts';
import { definitionClassique } from '../src/moteur/regions.ts';
import type { Niveau } from '../src/types/niveaux.ts';
import { VERSION_FORMAT_PACK, type GrillePack, type PackSudoku } from '../src/types/pack.ts';
import { creerAlea } from '../src/utils/alea.ts';
import { argumentNombre } from './bench/outils.ts';
import { DOSSIER_SRC } from './chemins.ts';

const JEU = 'sudoku-classique';
const NIVEAUX_PACKS: readonly Niveau[] = ['expert', 'diabolique'];
const DOSSIER_PACKS = join(DOSSIER_SRC, 'games', JEU, 'packs');

const nombre = argumentNombre('n', 200);
const definition = definitionClassique(9, 3, 3);

/** JSON compact, une grille par ligne. */
function enJson(pack: PackSudoku): string {
  const { grilles, ...entete } = pack;
  const debut = JSON.stringify(entete).slice(0, -1);
  const lignes = grilles.map((g) => JSON.stringify(g)).join(',\n');
  return `${debut},"grilles":[\n${lignes}\n]}\n`;
}

function genererPack(niveau: Niveau): PackSudoku {
  const grilles: GrillePack[] = [];
  for (let graine = 1; grilles.length < nombre; graine++) {
    const r = genererParNiveau(definition, niveau, creerAlea(graine));
    if (!r.ok) {
      console.log(`  graine ${graine} : ${r.raison} (sautée)`);
      continue;
    }
    grilles.push({ graine, enonce: grilleEnTexte(r.enonce), solution: grilleEnTexte(r.solution), notation: r.notation });
  }
  return { version: VERSION_FORMAT_PACK, versionNotation: VERSION_NOTATION, jeu: JEU, niveau, grilles };
}

mkdirSync(DOSSIER_PACKS, { recursive: true });
for (const niveau of NIVEAUX_PACKS) {
  const t0 = performance.now();
  const pack = genererPack(niveau);
  const json = enJson(pack);
  // Garde-fou : le fichier écrit doit passer la garde de validation utilisée à l'exécution
  if (!estPackSudoku(JSON.parse(json))) throw new Error(`Pack ${niveau} invalide : rien n'est écrit`);
  const fichier = join(DOSSIER_PACKS, `${niveau}.json`);
  writeFileSync(fichier, json);
  const octets = statSync(fichier).size;
  const secondes = (performance.now() - t0) / 1000;
  console.log(
    `${niveau.padEnd(10)} ${pack.grilles.length} grilles, ${(octets / 1024).toFixed(1)} Ko ` +
      `(${Math.round(octets / pack.grilles.length)} octets/grille), ${secondes.toFixed(1)} s`,
  );
}
