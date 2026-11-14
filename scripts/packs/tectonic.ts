// Packs du Tectonic : Difficile, Expert et Diabolique (graines 1, 2, 3… ; une graine en échec est sautée,
// comme une graine qui redonne une grille déjà dans le pack : la suite du générateur aléatoire d'une graine
// peut rejoindre celle d'une graine voisine, ce qui arrive avec les millions de tirages d'une grille 10 × 10).
// Écrit src/games/tectonic/packs/<niveau>.json. À relancer dès que VERSION_NOTATION_TECTONIC change.
// Durée sur PC : quelques minutes par niveau (200 grilles chacun).

import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { genererTectonic } from '../../src/games/tectonic/generateur.ts';
import { VERSION_NOTATION_TECTONIC } from '../../src/games/tectonic/notation.ts';
import {
  donneesEnTextes,
  estPackTectonic,
  NIVEAUX_AVEC_PACK,
  VERSION_FORMAT_PACK_TECTONIC,
  type GrillePackTectonic,
  type PackTectonic,
} from '../../src/games/tectonic/packs.ts';
import type { Niveau } from '../../src/types/niveaux.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { DOSSIER_SRC } from '../chemins.ts';
import { ecrirePack } from './outils.ts';

const JEU = 'tectonic';
export const NIVEAUX_PACKS_TECTONIC: readonly Niveau[] = NIVEAUX_AVEC_PACK;
const DOSSIER_PACKS = join(DOSSIER_SRC, 'games', JEU, 'packs');
/** Même limite que le bench. */
const TENTATIVES_MAX = 1000;

function genererPack(niveau: Niveau, nombre: number): PackTectonic {
  const grilles: GrillePackTectonic[] = [];
  const dejaVues = new Map<string, number>();
  const t0 = performance.now();
  for (let graine = 1; grilles.length < nombre; graine++) {
    const r = genererTectonic(niveau, creerAlea(graine), { tentativesMax: TENTATIVES_MAX });
    if (!r.ok) {
      console.log(`  graine ${graine} : ${r.raison} (sautée)`);
      continue;
    }
    const textes = donneesEnTextes(r.donnees);
    const cle = textes.zones + textes.enonce;
    const premiere = dejaVues.get(cle);
    if (premiere !== undefined) {
      console.log(`  graine ${graine} : même grille que la graine ${premiere} (sautée)`);
      continue;
    }
    dejaVues.set(cle, graine);
    grilles.push({ graine, ...textes, notation: r.notation });
    if (grilles.length % 20 === 0) {
      console.log(`  ${niveau} : ${grilles.length}/${nombre} (${((performance.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }
  return { version: VERSION_FORMAT_PACK_TECTONIC, versionNotation: VERSION_NOTATION_TECTONIC, jeu: JEU, niveau, grilles };
}

export function packsTectonic(niveaux: readonly Niveau[], nombre: number): void {
  for (const niveau of niveaux) {
    const t0 = performance.now();
    ecrirePack(DOSSIER_PACKS, niveau, genererPack(niveau, nombre), (v) => estPackTectonic(v), t0);
  }
}
