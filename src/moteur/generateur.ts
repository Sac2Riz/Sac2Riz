// Générateur de grilles : grille complète aléatoire, puis retrait de chiffres
// tant que la solution reste unique. Même graine (alea) → même grille. Code pur.

import type { Alea } from '../types/alea.ts';
import type { Cellule, DefinitionGrille, ValeursGrille } from '../types/grille.ts';
import { compterSolutionsAvec } from './backtracking.ts';
import { compiler } from './structure.ts';
import { estSolution } from './validation.ts';

/** Grille générée : énoncé (0 = case vide) et solution complète. */
export type GrilleGeneree = {
  readonly enonce: number[];
  readonly solution: number[];
};

/**
 * Symétrie des cases retirées :
 * - 'centrale' : la case (l, c) et son symétrique par rapport au centre sont retirées ensemble (par défaut) ;
 * - 'aucune' : chaque case est retirée indépendamment.
 */
export type Symetrie = 'centrale' | 'aucune';

/** Informations transmises à la fonction d'acceptation après chaque retrait réussi. */
export type EtatRetrait = {
  /** Énoncé après le retrait (copie : la modifier n'a aucun effet). Solution toujours unique. */
  readonly enonce: ValeursGrille;
  readonly solution: ValeursGrille;
  /** Nombre de chiffres encore donnés. */
  readonly nombreIndices: number;
  /** Cases qui viennent d'être vidées (1 ou 2 selon la symétrie). */
  readonly cellulesRetirees: readonly Cellule[];
};

/**
 * Décision de la fonction d'acceptation :
 * - 'continuer' : garder ce retrait et poursuivre ;
 * - 'refuser'   : remettre les chiffres retirés et poursuivre avec les cases suivantes ;
 * - 'arreter'   : garder ce retrait et terminer immédiatement (ex. Débutant : assez de cases vides).
 */
export type DecisionRetrait = 'continuer' | 'refuser' | 'arreter';

export type FonctionAcceptation = (etat: EtatRetrait) => DecisionRetrait;

export type OptionsRetrait = {
  readonly symetrie: Symetrie;
  /** On ne descend jamais sous ce nombre de chiffres donnés. */
  readonly indicesMin: number;
  /** Appelée après chaque retrait qui garde la solution unique ; null = tout accepter. */
  readonly accepter: FonctionAcceptation | null;
};

const OPTIONS_RETRAIT_PAR_DEFAUT: OptionsRetrait = {
  symetrie: 'centrale',
  indicesMin: 0,
  accepter: null,
};

/** Remplit entièrement une grille vide, au hasard. */
export function genererGrilleComplete(definition: DefinitionGrille, alea: Alea): number[] {
  const structure = compiler(definition);
  const vide = new Array<number>(structure.nombreCellules).fill(0);
  const { solution } = compterSolutionsAvec(structure, vide, { limite: 1, alea });
  if (solution === null) throw new Error('Aucune grille complète ne respecte cette définition');
  return solution;
}

/** Groupes de cases à retirer ensemble, dans un ordre aléatoire. */
function groupesDeRetrait(nombreCellules: number, symetrie: Symetrie, alea: Alea): Cellule[][] {
  const ordre = alea.melanger(Array.from({ length: nombreCellules }, (_, c) => c));
  if (symetrie === 'aucune') return ordre.map((c) => [c]);
  // Symétrie centrale : (l, c) ↔ (L-1-l, C-1-c), soit l'indice c ↔ N-1-c
  const vues = new Set<Cellule>();
  const groupes: Cellule[][] = [];
  for (const c of ordre) {
    if (vues.has(c)) continue;
    const symetrique = nombreCellules - 1 - c;
    vues.add(c).add(symetrique);
    groupes.push(c === symetrique ? [c] : [c, symetrique]);
  }
  return groupes;
}

/**
 * Retire des chiffres d'une solution complète, dans un ordre aléatoire, en gardant
 * une solution unique. Renvoie le nouvel énoncé (la solution passée n'est pas modifiée).
 */
export function retirerChiffres(
  definition: DefinitionGrille,
  solution: ValeursGrille,
  alea: Alea,
  options: Partial<OptionsRetrait> = {},
): number[] {
  const { symetrie, indicesMin, accepter } = { ...OPTIONS_RETRAIT_PAR_DEFAUT, ...options };
  if (!estSolution(definition, solution)) throw new Error('La grille fournie n\'est pas une solution valide');
  const structure = compiler(definition);
  const enonce = [...solution];
  let nombreIndices = enonce.length;

  for (const groupe of groupesDeRetrait(structure.nombreCellules, symetrie, alea)) {
    if (nombreIndices - groupe.length < indicesMin) continue;
    for (const c of groupe) enonce[c] = 0;
    const { nombre, interrompu } = compterSolutionsAvec(structure, enonce, { limite: 2 });
    if (nombre !== 1 || interrompu) {
      for (const c of groupe) enonce[c] = solution[c] ?? 0;
      continue;
    }
    nombreIndices -= groupe.length;
    if (accepter === null) continue;
    const decision = accepter({ enonce: [...enonce], solution, nombreIndices, cellulesRetirees: [...groupe] });
    if (decision === 'refuser') {
      for (const c of groupe) enonce[c] = solution[c] ?? 0;
      nombreIndices += groupe.length;
    } else if (decision === 'arreter') {
      break;
    }
  }
  return enonce;
}

/** Grille complète au hasard puis retrait de chiffres : énoncé à solution unique + solution. */
export function genererGrille(
  definition: DefinitionGrille,
  alea: Alea,
  options: Partial<OptionsRetrait> = {},
): GrilleGeneree {
  const solution = genererGrilleComplete(definition, alea);
  return { enonce: retirerChiffres(definition, solution, alea, options), solution };
}
