// INTERACTION du Tectonic : ce que produit chaque toucher, calculé par des fonctions pures (testées
// sous Node). La vue (vue.ts) ne fait que dessiner et transmettre les touchers.
// - valeursPossibles : touches du pavé commun qui ont un sens dans la case sélectionnée (contrat de
//   vue, InstanceVue.valeursPossibles) ;
// - casesEnEvidence : zone de la case et cases qui la touchent (réglage « mise en évidence ») ;
// - actionSaisie : action jouée par une touche du pavé (notes, retrait automatique) ;
// - deplacer : sélection déplacée par les flèches du clavier ;
// - traits : tracé des traits fins (dans une zone) et épais (entre deux zones) de la grille.
// Code pur.

import { structureDe } from './grille.ts';
import type { ActionTectonic, DonneesTectonic } from './types.ts';

/**
 * Valeurs du pavé utilisables dans la case sélectionnée : 1 à N dans une zone de N cases (que la
 * case soit vide ou déjà remplie par le joueur), aucune sur une case donnée, null sans sélection.
 * Seule la taille de la zone compte, jamais les chiffres voisins : le pavé ne doit pas donner d'indice.
 */
export function valeursPossibles(donnees: DonneesTectonic, selection: number | null): string[] | null {
  if (selection === null) return null;
  if ((donnees.enonce[selection] ?? 0) !== 0) return [];
  const taille = structureDe(donnees).tailleCase[selection] ?? 0;
  return Array.from({ length: taille }, (_, i) => String(i + 1));
}

/** Cases mises en évidence autour de la sélection : sa zone et les (jusqu'à 8) cases qui la touchent. */
export function casesEnEvidence(donnees: DonneesTectonic, selection: number | null): ReadonlySet<number> {
  if (selection === null) return new Set();
  return new Set(structureDe(donnees).voisines[selection] ?? []);
}

/** Type d'action d'une touche du pavé, selon le mode notes et le réglage du retrait des notes. */
export type ModePose = 'noter' | 'placer' | 'placer-seul';

export function modePose(modeNotes: boolean, retraitAuto: boolean): ModePose {
  if (modeNotes) return 'noter';
  return retraitAuto ? 'placer' : 'placer-seul';
}

/**
 * Action jouée par la touche « texte » du pavé dans la case sélectionnée, ou null (rien de
 * sélectionné, case donnée, valeur hors de la zone : la logique la refuserait de toute façon).
 */
export function actionSaisie(
  donnees: DonneesTectonic,
  selection: number | null,
  texte: string,
  mode: ModePose,
): ActionTectonic | null {
  if (selection === null || !(valeursPossibles(donnees, selection) ?? []).includes(texte)) return null;
  return { type: mode, cellule: selection, valeur: Number(texte) };
}

/** Sélection après une flèche (dl, dc) : la grille est parcourue en boucle ; sans sélection, la 1re case. */
export function deplacer(donnees: DonneesTectonic, selection: number | null, dl: number, dc: number): number {
  if (selection === null) return 0;
  const { lignes, colonnes } = donnees;
  const l = (Math.floor(selection / colonnes) + dl + lignes) % lignes;
  const c = ((selection % colonnes) + dc + colonnes) % colonnes;
  return l * colonnes + c;
}

/** Tracés SVG (unité = une case) des traits intérieurs de la grille ; le cadre est dessiné à part. */
export type Traits = {
  /** Côtés communs à deux cases de la même zone. */
  readonly fins: string;
  /** Côtés communs à deux cases de zones différentes. */
  readonly epais: string;
};

/** Traits intérieurs de la grille, d'après la carte des zones (segments « M x y h|v 1 »). */
export function traits(donnees: DonneesTectonic): Traits {
  const { lignes, colonnes, zones } = donnees;
  const fins: string[] = [];
  const epais: string[] = [];
  for (let l = 0; l < lignes; l++) {
    for (let c = 0; c < colonnes; c++) {
      const cellule = l * colonnes + c;
      // Côté droit (trait vertical en x = c + 1) et côté bas (trait horizontal en y = l + 1)
      if (c + 1 < colonnes) (zones[cellule] === zones[cellule + 1] ? fins : epais).push(`M${c + 1} ${l}v1`);
      if (l + 1 < lignes) (zones[cellule] === zones[cellule + colonnes] ? fins : epais).push(`M${c} ${l + 1}h1`);
    }
  }
  return { fins: fins.join(''), epais: epais.join('') };
}
