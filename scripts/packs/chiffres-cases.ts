// Packs des chiffres casés : Expert et Diabolique (graines 1, 2, 3… ; une graine en échec est sautée).
// Écrit src/games/chiffres-cases/packs/<niveau>.json. À relancer dès que VERSION_NOTATION_CASES change.
// Durée sur PC : quelques minutes pour Expert, une vingtaine pour Diabolique (200 grilles chacun).

import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { genererCases } from '../../src/games/chiffres-cases/generateur.ts';
import { VERSION_NOTATION_CASES } from '../../src/games/chiffres-cases/notation.ts';
import {
  donneesEnTexte,
  estPackCases,
  NIVEAUX_AVEC_PACK,
  VERSION_FORMAT_PACK_CASES,
  type GrillePackCases,
  type PackCases,
} from '../../src/games/chiffres-cases/packs.ts';
import type { Niveau } from '../../src/types/niveaux.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { DOSSIER_SRC } from '../chemins.ts';
import { ecrirePack } from './outils.ts';

const JEU = 'chiffres-cases';
export const NIVEAUX_PACKS_CASES: readonly Niveau[] = NIVEAUX_AVEC_PACK;
const DOSSIER_PACKS = join(DOSSIER_SRC, 'games', JEU, 'packs');
/** Même limite que le bench. */
const TENTATIVES_MAX = 1000;

function genererPack(niveau: Niveau, nombre: number): PackCases {
  const grilles: GrillePackCases[] = [];
  const t0 = performance.now();
  for (let graine = 1; grilles.length < nombre; graine++) {
    const r = genererCases(niveau, creerAlea(graine), { tentativesMax: TENTATIVES_MAX });
    if (!r.ok) {
      console.log(`  graine ${graine} : ${r.raison} (sautée)`);
      continue;
    }
    grilles.push({ graine, grille: donneesEnTexte(r.donnees), preplaces: r.donnees.preplaces, notation: r.notation });
    if (grilles.length % 20 === 0) {
      console.log(`  ${niveau} : ${grilles.length}/${nombre} (${((performance.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }
  return { version: VERSION_FORMAT_PACK_CASES, versionNotation: VERSION_NOTATION_CASES, jeu: JEU, niveau, grilles };
}

export function packsChiffresCases(niveaux: readonly Niveau[], nombre: number): void {
  for (const niveau of niveaux) {
    const t0 = performance.now();
    ecrirePack(DOSSIER_PACKS, niveau, genererPack(niveau, nombre), (v) => estPackCases(v), t0);
  }
}
