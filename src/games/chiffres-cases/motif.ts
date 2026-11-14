// MOTIF des cases noires d'une grille de chiffres casés (génération). Code pur.
//
// 1. Cases noires tirées au hasard, par paires symétriques par rapport au centre, jusqu'à la densité visée ;
// 2. toute suite blanche plus longue que la longueur maximale est coupée par une case noire (et sa symétrique) ;
// 3. une case blanche qui n'appartient à aucun emplacement (isolée) devient noire ;
// 4. le motif est refusé (null) si les cases blanches ne sont pas d'un seul tenant.

import type { Alea } from '../../types/alea.ts';
import { casesIsolees, estConnexe, grilleDe, type Grille } from './grille.ts';

export type ParametresMotif = {
  readonly largeur: number;
  readonly hauteur: number;
  /** Part visée de cases noires (avant les étapes 2 et 3). */
  readonly densite: number;
  /** Longueur maximale d'un emplacement. */
  readonly longueurMax: number;
};

/** Suites blanches trop longues (une seule à la fois : chaque coupure change les autres). */
function premiereSuiteTropLongue(largeur: number, hauteur: number, noires: readonly boolean[], longueurMax: number): number[] | null {
  for (const horizontal of [true, false]) {
    const [externe, interne] = horizontal ? [hauteur, largeur] : [largeur, hauteur];
    for (let a = 0; a < externe; a++) {
      let suite: number[] = [];
      for (let b = 0; b <= interne; b++) {
        const c = horizontal ? a * largeur + b : b * largeur + a;
        if (b < interne && noires[c] === false) {
          suite.push(c);
          continue;
        }
        if (suite.length > longueurMax) return suite;
        suite = [];
      }
    }
  }
  return null;
}

/** Essais internes : un motif refusé coûte très peu, on en tire un autre. */
const ESSAIS_MOTIF = 50;

/** Motif valide, ou null après ESSAIS_MOTIF refus (en pratique jamais). */
export function genererMotif(params: ParametresMotif, alea: Alea): Grille | null {
  for (let essai = 0; essai < ESSAIS_MOTIF; essai++) {
    const grille = essayerMotif(params, alea);
    if (grille !== null) return grille;
  }
  return null;
}

function essayerMotif(params: ParametresMotif, alea: Alea): Grille | null {
  const { largeur, hauteur, densite, longueurMax } = params;
  const total = largeur * hauteur;
  const noires = new Array<boolean>(total).fill(false);
  const noircir = (c: number): void => {
    noires[c] = true;
    noires[total - 1 - c] = true;
  };

  // 1. Densité visée
  const cible = Math.round(densite * total);
  let nombre = 0;
  for (const c of alea.melanger([...Array(total).keys()])) {
    if (nombre >= cible) break;
    if (noires[c] === true) continue;
    noircir(c);
    nombre = noires.filter(Boolean).length;
  }

  // 2. Coupure des suites trop longues (en évitant de créer un morceau d'une seule case si possible)
  for (let garde = 0; garde < total; garde++) {
    const suite = premiereSuiteTropLongue(largeur, hauteur, noires, longueurMax);
    if (suite === null) break;
    const positions = suite.map((_, i) => i).filter((i) => i >= 2 && i <= suite.length - 3);
    const choix = positions.length > 0 ? positions : suite.map((_, i) => i);
    noircir(suite[choix[alea.entier(choix.length)] ?? 0] ?? 0);
  }

  // 3. Cases isolées → noires (une case isolée et sa symétrique le sont toutes les deux)
  for (const c of casesIsolees(grilleDe(largeur, hauteur, noires))) noircir(c);

  // 4. Contrôles
  const grille = grilleDe(largeur, hauteur, noires);
  if (premiereSuiteTropLongue(largeur, hauteur, noires, longueurMax) !== null) return null;
  if (casesIsolees(grille).length > 0 || !estConnexe(grille)) return null;
  return grille;
}
