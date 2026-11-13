// Mesure des performances : « npm run bench » (graines fixes, résultats reproductibles).
// Options : --n=<nombre> grilles par mesure de niveau (défaut 100), --rapide (n = 20).
//  1. moteur : génération de grilles minimales et vérification d'unicité ;
//  2. répartition des niveaux de grilles minimales au hasard ;
//  3. génération par niveau : temps, essais, échecs, chiffres donnés ;
//  4. mesures servant à calibrer la force.

import { performance } from 'node:perf_hooks';
import { benchMoteur } from './bench/moteur.ts';
import { benchNiveaux, benchRepartition } from './bench/niveaux.ts';
import { argumentNombre } from './bench/outils.ts';
import { definitionClassique } from '../src/moteur/regions.ts';

const rapide = process.argv.includes('--rapide');
const nombre = argumentNombre('n', rapide ? 20 : 100);
const definition = definitionClassique(9, 3, 3);
const debut = performance.now();

console.log(`# Sudoku 9x9 — bench${rapide ? ' (rapide)' : ''}\n`);
benchMoteur(definition, 100);
benchRepartition(definition, nombre * 5);
benchNiveaux(definition, nombre);
console.log(`Durée totale : ${((performance.now() - debut) / 1000).toFixed(1)} s`);
