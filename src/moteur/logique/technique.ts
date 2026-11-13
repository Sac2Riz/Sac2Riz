// Ce qu'est une technique pour le solveur logique, et la fabrique commune des étapes.
//
// Règle importante : une technique ne renvoie une étape que si elle fait réellement progresser
// la grille. construireEtape() ne garde que les placements dans des cases vides et les
// éliminations de candidats encore présents, et renvoie null s'il ne reste rien : la technique
// passe alors au motif suivant au lieu de renvoyer un motif sans effet. Code pur.

import type { Cellule } from '../../types/grille.ts';
import type { CandidatsCase, EtatLogique, Etape, IdTechnique, Placement } from '../../types/logique.ts';
import type { Niveau } from '../../types/niveaux.ts';
import { valeursDuMasque } from '../candidats.ts';
import type { Contexte } from './contexte.ts';
import { listeFr, nomCellule } from './noms.ts';

/** Identité d'une technique. */
export type InfosTechnique = {
  readonly id: IdTechnique;
  readonly niveau: Niveau;
  /** Nom affiché (ex. « Paire nue »). */
  readonly nom: string;
};

/** Une technique : cherche la première occurrence utile de son motif, ou renvoie null. Fonction pure. */
export type Technique = InfosTechnique & {
  readonly chercher: (ctx: Contexte, etat: EtatLogique) => Etape | null;
};

/** Élimination brute proposée par une technique : candidats (masque) à retirer d'une case. */
export type EliminationBrute = {
  readonly cellule: Cellule;
  readonly masque: number;
};

/** Motif trouvé par une technique, avant filtrage des effets. */
export type Motif = {
  readonly cellules: readonly Cellule[];
  readonly candidatsMotif: readonly CandidatsCase[];
  readonly regions: readonly number[];
  /** Phrase qui décrit le motif ; la description des effets est ajoutée automatiquement. */
  readonly description: string;
  readonly placements: readonly Placement[];
  readonly eliminations: readonly EliminationBrute[];
};

/** Candidats (éventuellement restreints à un masque) d'une liste de cases. */
export function candidatsDe(
  etat: EtatLogique,
  cellules: readonly Cellule[],
  masque = -1,
): CandidatsCase[] {
  return cellules.map((cellule) => ({
    cellule,
    valeurs: valeursDuMasque((etat.candidats[cellule] ?? 0) & masque),
  }));
}

/** Phrase décrivant les effets : « On place le 7 en L3C5. » / « On élimine le 4 de L1C2 et L5C2. » */
function decrireEffets(ctx: Contexte, placements: readonly Placement[], eliminations: readonly CandidatsCase[]): string {
  if (placements.length > 0) {
    return `On place ${listeFr(placements.map((p) => `le ${p.valeur} en ${nomCellule(ctx, p.cellule)}`))}.`;
  }
  // Regroupement par valeur : « le 4 de L1C2 et L5C2 ; le 6 de L3C3 »
  const parValeur = new Map<number, Cellule[]>();
  for (const { cellule, valeurs } of eliminations) {
    for (const v of valeurs) parValeur.set(v, [...(parValeur.get(v) ?? []), cellule]);
  }
  const morceaux = [...parValeur.keys()]
    .sort((a, b) => a - b)
    .map((v) => `le ${v} de ${listeFr((parValeur.get(v) ?? []).map((c) => nomCellule(ctx, c)))}`);
  return `On élimine ${morceaux.join(' ; ')}.`;
}

/**
 * Construit l'étape correspondant à un motif, en ne gardant que ses effets réels.
 * Renvoie null si le motif ne change rien à la grille.
 */
export function construireEtape(
  infos: InfosTechnique,
  ctx: Contexte,
  etat: EtatLogique,
  motif: Motif,
): Etape | null {
  const placements: Placement[] = [];
  const dejaPlacees = new Set<Cellule>();
  for (const p of motif.placements) {
    if ((etat.valeurs[p.cellule] ?? 0) !== 0 || dejaPlacees.has(p.cellule)) continue;
    dejaPlacees.add(p.cellule);
    placements.push(p);
  }

  // Fusion par case, puis filtrage : seulement les candidats encore présents dans des cases vides
  const parCase = new Map<Cellule, number>();
  for (const { cellule, masque } of motif.eliminations) {
    parCase.set(cellule, (parCase.get(cellule) ?? 0) | masque);
  }
  const eliminations: CandidatsCase[] = [];
  for (const cellule of [...parCase.keys()].sort((a, b) => a - b)) {
    if ((etat.valeurs[cellule] ?? 0) !== 0) continue;
    const effectifs = (etat.candidats[cellule] ?? 0) & (parCase.get(cellule) ?? 0);
    if (effectifs !== 0) eliminations.push({ cellule, valeurs: valeursDuMasque(effectifs) });
  }

  if (placements.length === 0 && eliminations.length === 0) return null;
  return {
    technique: infos.id,
    niveau: infos.niveau,
    cellules: motif.cellules,
    candidatsMotif: motif.candidatsMotif,
    regions: motif.regions,
    placements,
    eliminations,
    explication: `${motif.description} ${decrireEffets(ctx, placements, eliminations)}`,
  };
}
