// Aides des tests des chiffres casés : petites grilles écrites à la main et états préparés.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { structureDe, type Probleme, type Structure } from '../../../src/games/chiffres-cases/probleme.ts';
import { etatDepart, type EtatSolveur } from '../../../src/games/chiffres-cases/solveur/etat.ts';
import { resoudre } from '../../../src/games/chiffres-cases/solveur/solveur.ts';
import { NOIRE, type DonneesCases } from '../../../src/games/chiffres-cases/types.ts';
import type { Niveau } from '../../../src/types/niveaux.ts';

/** Nombre de grilles de chaque pack embarqué. */
export const NOMBRE_GRILLES_PACK = 200;

/** Contenu brut (non vérifié) du pack embarqué d'un niveau. */
export function lirePack(niveau: Niveau): unknown {
  const url = new URL(`../../../src/games/chiffres-cases/packs/${niveau}.json`, import.meta.url);
  const contenu: unknown = JSON.parse(readFileSync(url, 'utf8'));
  return contenu;
}

/** Niveaux générés en moins d'une demi-seconde : seuls contrôlés par le contrat dans npm test. */
export const NIVEAUX_RAPIDES: readonly Niveau[] = ['debutant', 'facile', 'moyen', 'difficile'];

/** Données d'une grille écrite ligne par ligne (« # » = case noire). */
export function donneesDe(lignes: readonly string[], preplaces: readonly number[] = []): DonneesCases {
  return {
    largeur: lignes[0]?.length ?? 0,
    hauteur: lignes.length,
    solution: lignes.flatMap((l) => [...l].map((c) => (c === '#' ? NOIRE : Number(c)))),
    preplaces,
  };
}

/**
 * GRILLE A (3 × 3, case centrale noire), 4 emplacements de 3 cases :
 *   1 2 3      0 : horizontal L1C1 = 123     1 : vertical L1C1 = 146
 *   4 # 5      2 : vertical L1C3 = 358       3 : horizontal L3C1 = 678
 *   6 7 8
 * Sans pré-placé, elle a DEUX solutions (la transposée : 146 / 123 / 678 / 358).
 */
export const GRILLE_A = ['123', '4#5', '678'];

export const H1 = 0;
export const V1 = 1;
export const V3 = 2;
export const H3 = 3;

export function structureA(preplaces: readonly number[] = []): { donnees: DonneesCases; s: Structure; p: Probleme } {
  const donnees = donneesDe(GRILLE_A, preplaces);
  const s = structureDe(donnees);
  return { donnees, s, p: s.probleme };
}

/** Indice d'un nombre dans la liste du problème. */
export function n(p: Probleme, texte: string): number {
  const i = p.nombres.indexOf(texte);
  if (i < 0) throw new Error(`Nombre absent de la liste : ${texte}`);
  return i;
}

/** État préparé : candidats donnés en texte pour chaque emplacement, aucun emplacement rempli. */
export function etatAvec(p: Probleme, candidats: readonly (readonly string[])[]): EtatSolveur {
  return {
    affectes: candidats.map(() => -1),
    candidats: candidats.map((liste) => liste.map((t) => n(p, t))),
  };
}

/** Candidats d'un emplacement, en texte. */
export function candidatsTexte(p: Probleme, etat: EtatSolveur, emplacement: number): string[] {
  return (etat.candidats[emplacement] ?? []).map((i) => p.nombres[i] ?? '?');
}

/** Chaque étape du solveur est juste : placements et éliminations comparés à la solution. */
export function verifierSurete(donnees: DonneesCases): string[] {
  const { probleme: p, solution } = structureDe(donnees);
  const donnes = donnees.preplaces.map((emplacement) => ({ emplacement, nombre: solution[emplacement] ?? -1 }));
  const r = resoudre(p, etatDepart(p, donnes));
  assert.equal(r.statut, 'resolu');
  for (const etape of r.etapes) {
    for (const pl of etape.placements) assert.equal(pl.nombre, solution[pl.emplacement], `${etape.technique} : placement faux`);
    for (const el of etape.eliminations) {
      assert.ok(!el.nombres.includes(solution[el.emplacement] ?? -1), `${etape.technique} : élimine la solution`);
    }
  }
  return r.etapes.map((e) => e.technique);
}
