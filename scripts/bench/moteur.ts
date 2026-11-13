// Bench du moteur (étape 1) : génération de grilles minimales et vérification d'unicité.

import { performance } from 'node:perf_hooks';
import { compterSolutionsAvec } from '../../src/moteur/backtracking.ts';
import { genererGrille } from '../../src/moteur/generateur.ts';
import { compiler } from '../../src/moteur/structure.ts';
import type { DefinitionGrille } from '../../src/types/grille.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { stats, tableau } from './outils.ts';

type Mesure = { generation: number; unicite: number; indices: number; noeuds: number };

function mesurer(definition: DefinitionGrille, graine: number): Mesure {
  const structure = compiler(definition);
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

export function benchMoteur(definition: DefinitionGrille, nombre: number): void {
  // Échauffement : laisse le moteur JavaScript optimiser le code avant de mesurer
  for (let i = 0; i < 10; i++) mesurer(definition, 1_000_000 + i);
  const mesures = Array.from({ length: nombre }, (_, i) => mesurer(definition, i + 1));

  console.log(`## 1. Moteur — grilles minimales, symétrie centrale (${nombre} grilles, graines 1 à ${nombre})\n`);
  const ligne = (nom: string, valeurs: readonly number[], decimales: number, unite: string): string[] => {
    const s = stats(valeurs);
    return [nom, s.moyenne.toFixed(decimales), s.mediane.toFixed(decimales), s.max.toFixed(decimales), unite];
  };
  tableau(
    ['', 'moyenne', 'médiane', 'max', ''],
    [
      ligne('Génération complète', mesures.map((m) => m.generation), 2, 'ms'),
      ligne('Vérification d\'unicité', mesures.map((m) => m.unicite), 3, 'ms'),
      ligne('Nœuds (vérif. unicité)', mesures.map((m) => m.noeuds), 0, ''),
      ligne('Chiffres donnés', mesures.map((m) => m.indices), 1, ''),
    ],
  );
}
