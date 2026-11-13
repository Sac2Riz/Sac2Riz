// Mesure des performances du moteur : « npm run bench ».
// Génère des grilles 9x9 (graines 1 à N, résultats reproductibles) et affiche les temps
// de génération (grille complète + retrait de chiffres) et de vérification d'unicité.

import { performance } from 'node:perf_hooks';
import { compterSolutionsAvec } from '../src/moteur/backtracking.ts';
import { genererGrille } from '../src/moteur/generateur.ts';
import { definitionClassique } from '../src/moteur/regions.ts';
import { compiler } from '../src/moteur/structure.ts';
import { creerAlea } from '../src/utils/alea.ts';

const NOMBRE_GRILLES = 100;
const ECHAUFFEMENT = 10;

const definition = definitionClassique(9, 3, 3);
const structure = compiler(definition);

type Mesure = { generation: number; unicite: number; indices: number; noeuds: number };

function mesurer(graine: number): Mesure {
  const t0 = performance.now();
  const { enonce } = genererGrille(definition, creerAlea(graine));
  const t1 = performance.now();
  const resultat = compterSolutionsAvec(structure, enonce, { limite: 2 });
  const t2 = performance.now();
  if (resultat.nombre !== 1) throw new Error(`Graine ${graine} : grille non unique !`);
  return {
    generation: t1 - t0,
    unicite: t2 - t1,
    indices: enonce.filter((v) => v !== 0).length,
    noeuds: resultat.noeuds,
  };
}

function stats(valeurs: readonly number[]): { moyenne: number; mediane: number; max: number } {
  const tries = [...valeurs].sort((a, b) => a - b);
  const moyenne = tries.reduce((s, v) => s + v, 0) / tries.length;
  const mediane = tries[Math.floor(tries.length / 2)] ?? 0;
  const max = tries[tries.length - 1] ?? 0;
  return { moyenne, mediane, max };
}

function ligne(nom: string, valeurs: readonly number[], unite: string, decimales: number): string {
  const { moyenne, mediane, max } = stats(valeurs);
  const f = (x: number): string => x.toFixed(decimales).padStart(9);
  return `${nom.padEnd(26)}${f(moyenne)}${f(mediane)}${f(max)}  ${unite}`;
}

// Échauffement : laisse le moteur JavaScript optimiser le code avant de mesurer
for (let i = 0; i < ECHAUFFEMENT; i++) mesurer(1_000_000 + i);

const mesures = Array.from({ length: NOMBRE_GRILLES }, (_, i) => mesurer(i + 1));
const total = mesures.reduce((s, m) => s + m.generation, 0);

console.log(`Sudoku 9x9, symétrie centrale — ${NOMBRE_GRILLES} grilles (graines 1 à ${NOMBRE_GRILLES})\n`);
console.log(`${''.padEnd(26)}${'moyenne'.padStart(9)}${'médiane'.padStart(9)}${'max'.padStart(9)}`);
console.log(ligne('Génération complète', mesures.map((m) => m.generation), 'ms', 2));
console.log(ligne('Vérification d\'unicité', mesures.map((m) => m.unicite), 'ms', 3));
console.log(ligne('Nœuds (vérif. unicité)', mesures.map((m) => m.noeuds), '', 0));
console.log(ligne('Chiffres donnés', mesures.map((m) => m.indices), '', 1));
console.log(`\nTemps total de génération : ${(total / 1000).toFixed(2)} s`);
