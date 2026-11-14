// RÉGLAGES PROPRES À UN JEU (MetaJeu.reglages) : lecture et complétion des valeurs. Code pur,
// utilisé par le socle (écran des réglages, préparation d'une nouvelle partie) et par les jeux
// (logique.ts, vue.ts) pour lire la valeur d'un réglage qu'ils ont déclaré.

import type { ReglageJeu, ValeursReglagesJeu } from '../types/jeu.ts';

/** Valeur d'un réglage du jeu ; sa valeur par défaut s'il n'a jamais été changé. */
export function estActif(valeurs: ValeursReglagesJeu, reglage: ReglageJeu): boolean {
  return valeurs[reglage.id] ?? reglage.defaut;
}

/**
 * Valeurs de TOUS les réglages déclarés par un jeu : la valeur enregistrée, sinon la valeur par
 * défaut. Une valeur enregistrée d'un réglage que le jeu ne déclare plus est laissée de côté.
 */
export function valeursCompletes(
  declares: readonly ReglageJeu[],
  enregistrees: ValeursReglagesJeu | undefined,
): ValeursReglagesJeu {
  return Object.fromEntries(declares.map((r) => [r.id, enregistrees?.[r.id] ?? r.defaut]));
}

/** Vrai si un réglage qui change les données d'une nouvelle partie est activé (preparer à appeler). */
export function preparationDemandee(declares: readonly ReglageJeu[], valeurs: ValeursReglagesJeu): boolean {
  return declares.some((r) => r.preparation && estActif(valeurs, r));
}
