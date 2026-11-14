// Outils des tests du Tectonic : grilles de référence (générées avec une graine fixe) et niveaux rapides.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { genererTectonic } from '../../../src/games/tectonic/generateur.ts';
import type { DonneesTectonic } from '../../../src/games/tectonic/types.ts';
import type { Niveau } from '../../../src/types/niveaux.ts';
import { creerAlea } from '../../../src/utils/alea.ts';

/** Nombre de grilles de chaque pack embarqué. */
export const NOMBRE_GRILLES_PACK = 200;

/** Contenu brut (non vérifié) du pack embarqué d'un niveau. */
export function lirePack(niveau: Niveau): unknown {
  const url = new URL(`../../../src/games/tectonic/packs/${niveau}.json`, import.meta.url);
  const contenu: unknown = JSON.parse(readFileSync(url, 'utf8'));
  return contenu;
}

/** Niveaux contrôlés dans npm test (les autres, plus longs à générer, dans npm run test:long). */
export const NIVEAUX_RAPIDES: readonly Niveau[] = ['debutant', 'facile', 'moyen'];

/** Grille générée (graine fixe) ; échoue clairement si la génération ne réussit pas. */
export function grille(niveau: Niveau, graine: number): DonneesTectonic {
  const r = genererTectonic(niveau, creerAlea(graine));
  assert.ok(r.ok, `génération ${niveau} graine ${graine}`);
  return r.donnees;
}

/** Grille Débutant 6 × 6 de référence. */
export const DEBUTANT = grille('debutant', 1);

/** Première case vide de l'énoncé dont la zone a au moins la taille donnée. */
export function caseVide(donnees: DonneesTectonic, tailleMin = 1): number {
  const tailles = donnees.zones.map((z) => donnees.zones.filter((x) => x === z).length);
  const c = donnees.enonce.findIndex((v, i) => v === 0 && (tailles[i] ?? 0) >= tailleMin);
  assert.ok(c >= 0, 'case vide introuvable');
  return c;
}
