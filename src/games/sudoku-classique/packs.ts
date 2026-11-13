// PACKS du sudoku classique : grilles Expert et Diabolique pré-générées (npm run packs),
// converties en Puzzle pour le socle (socle/packs.ts). Chargées seulement quand la réserve est vide.

import { estPackSudoku, texteEnGrille } from '../../moteur/pack.ts';
import type { Puzzle } from '../../types/jeu.ts';
import type { Niveau } from '../../types/niveaux.ts';
import type { PackSudoku } from '../../types/pack.ts';
import { META } from './meta.ts';
import type { DonneesSudoku } from './types.ts';

/** Niveaux qui ont un pack (fichier packs/<niveau>.json). */
export const NIVEAUX_AVEC_PACK: readonly Niveau[] = ['expert', 'diabolique'];

/** Grilles d'un pack déjà validé, sous forme de Puzzle (code pur, testé sous Node). */
export function convertirPack(pack: PackSudoku): Puzzle<DonneesSudoku>[] {
  return pack.grilles.map((grille) => ({
    jeu: META.id,
    graine: grille.graine,
    notation: grille.notation,
    donnees: { enonce: texteEnGrille(grille.enonce), solution: texteEnGrille(grille.solution) },
  }));
}

/** Télécharge (depuis l'appli elle-même, hors ligne une fois en cache) et vérifie le pack du niveau. */
export async function chargerPack(niveau: Niveau): Promise<Puzzle<DonneesSudoku>[] | null> {
  if (!NIVEAUX_AVEC_PACK.includes(niveau)) return null;
  const reponse = await fetch(new URL(`./packs/${niveau}.json`, import.meta.url));
  if (!reponse.ok) throw new Error(`Pack ${niveau} introuvable (${reponse.status})`);
  const contenu: unknown = await reponse.json();
  // On ne fait jamais confiance à un fichier : un pack invalide (ou d'une autre version) est ignoré
  if (!estPackSudoku(contenu) || contenu.jeu !== META.id || contenu.niveau !== niveau) {
    throw new Error(`Pack ${niveau} invalide ou d'une autre version`);
  }
  return convertirPack(contenu);
}
