// BILAN DE FIN DE PARTIE : ce que l'écran de fin affiche. Code pur, testé sous Node.
// Une partie terminée avec des indices compte dans les statistiques, mais ne peut pas battre
// le record du meilleur temps : l'écran le dit au joueur.

import { INFOS_NIVEAUX, type Force, type Niveau } from '../types/niveaux.ts';
import { etoiles, formaterTemps } from './format.ts';

export type BilanFin = {
  readonly jeu: string;
  readonly niveau: Niveau;
  readonly force: Force;
  readonly tempsMs: number;
  /** Nom affiché de la technique la plus difficile de la grille. */
  readonly technique: string;
  readonly indicesUtilises: number;
  readonly nouveauRecord: boolean;
  /** Meilleur temps avant cette partie (null : première partie terminée à ce niveau). */
  readonly ancienRecordMs: number | null;
};

export type LigneBilan = { readonly libelle: string; readonly valeur: string };

export function lignesBilan(b: BilanFin): LigneBilan[] {
  return [
    { libelle: 'Temps', valeur: formaterTemps(b.tempsMs) },
    { libelle: 'Niveau', valeur: `${INFOS_NIVEAUX[b.niveau].nom} ${etoiles(b.niveau)}` },
    { libelle: 'Force', valeur: `${b.force} / 10` },
    { libelle: 'Technique la plus difficile', valeur: b.technique },
    { libelle: 'Indices utilisés', valeur: String(b.indicesUtilises) },
  ];
}

/** Phrase sur le record : battu, non pris en compte (indices), ou rappel du record actuel. */
export function messageRecord(b: BilanFin): string {
  if (b.nouveauRecord) {
    return b.ancienRecordMs === null
      ? 'Nouveau record : première grille terminée à ce niveau !'
      : `Nouveau record ! Ancien meilleur temps : ${formaterTemps(b.ancienRecordMs)}.`;
  }
  if (b.indicesUtilises > 0) return 'Record non pris en compte : des indices ont été utilisés.';
  return b.ancienRecordMs === null ? '' : `Meilleur temps à ce niveau : ${formaterTemps(b.ancienRecordMs)}.`;
}
