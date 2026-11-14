// Mesure des performances : « npm run bench » (graines fixes, résultats reproductibles).
// Options : --n=<nombre> grilles par mesure de niveau (défaut 100), --rapide (n = 20).
// Sudoku (par défaut) :
//  1. moteur : génération de grilles minimales et vérification d'unicité ;
//  2. répartition des niveaux de grilles minimales au hasard ;
//  3. génération par niveau : temps, essais, échecs, chiffres donnés ;
//  4. mesures servant à calibrer la force.
// Chiffres casés : « npm run bench -- --jeu=chiffres-cases [--niveau=<id>] » (voir bench/chiffres-cases.ts).

import { performance } from 'node:perf_hooks';
import { benchChiffresCases, niveauxDemandes } from './bench/chiffres-cases.ts';
import { benchMoteur } from './bench/moteur.ts';
import { benchNiveaux, benchRepartition } from './bench/niveaux.ts';
import { argumentNombre } from './bench/outils.ts';
import { definitionClassique } from '../src/moteur/regions.ts';

const rapide = process.argv.includes('--rapide');
const nombre = argumentNombre('n', rapide ? 20 : 100);
const debut = performance.now();

if (process.argv.includes('--jeu=chiffres-cases')) {
  console.log(`# Chiffres casés — bench${rapide ? ' (rapide)' : ''}\n`);
  benchChiffresCases(nombre, niveauxDemandes());
} else {
  const definition = definitionClassique(9, 3, 3);
  console.log(`# Sudoku 9x9 — bench${rapide ? ' (rapide)' : ''}\n`);
  benchMoteur(definition, 100);
  benchRepartition(definition, nombre * 5);
  benchNiveaux(definition, nombre);
}
console.log(`Durée totale : ${((performance.now() - debut) / 1000).toFixed(1)} s`);
