// Packs du sudoku classique : Expert et Diabolique (graines 1, 2, 3… ; une graine en échec est sautée).
// Écrit src/games/sudoku-classique/packs/<niveau>.json. À relancer dès que VERSION_NOTATION change.

import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { genererParNiveau } from '../../src/moteur/generation-niveau.ts';
import { VERSION_NOTATION } from '../../src/moteur/notation.ts';
import { estPackSudoku, grilleEnTexte } from '../../src/moteur/pack.ts';
import { definitionClassique } from '../../src/moteur/regions.ts';
import type { Niveau } from '../../src/types/niveaux.ts';
import { VERSION_FORMAT_PACK, type GrillePack, type PackSudoku } from '../../src/types/pack.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { DOSSIER_SRC } from '../chemins.ts';
import { ecrirePack } from './outils.ts';

const JEU = 'sudoku-classique';
export const NIVEAUX_PACKS_SUDOKU: readonly Niveau[] = ['expert', 'diabolique'];
const DOSSIER_PACKS = join(DOSSIER_SRC, 'games', JEU, 'packs');

function genererPack(niveau: Niveau, nombre: number): PackSudoku {
  const definition = definitionClassique(9, 3, 3);
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

export function packsSudoku(niveaux: readonly Niveau[], nombre: number): void {
  for (const niveau of niveaux) {
    const t0 = performance.now();
    ecrirePack(DOSSIER_PACKS, niveau, genererPack(niveau, nombre), (v) => estPackSudoku(v), t0);
  }
}
