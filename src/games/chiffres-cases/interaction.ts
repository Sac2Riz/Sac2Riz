// INTERACTION des chiffres casés : ce que produit chaque toucher (sélection, action à jouer) et ce
// que la vue doit afficher (liste groupée, emplacements mis en évidence). Code pur, sans DOM :
// vue.ts ne fait que dessiner et transmettre les touchers (testé sous Node).
//
// Deux façons de jouer :
// 1. Emplacement d'abord : toucher une case sélectionne l'emplacement qui la contient (l'horizontal
//    d'abord ; toucher à nouveau la même case passe au vertical, et inversement). Toucher ensuite
//    un nombre de la bonne longueur le place ; les autres longueurs sont estompées, sans effet.
// 2. Nombre d'abord : sans emplacement sélectionné, toucher un nombre le sélectionne et met en
//    évidence les emplacements vides de sa longueur (les « cibles ») ; toucher une case d'une cible
//    y place le nombre. Toucher à nouveau le nombre, ou une zone vide (case noire, marge), annule.
//    Toucher une autre case revient à la façon 1 (son emplacement est sélectionné).
// Une pose est définitive dès le toucher qui la fait : l'action est jouée et la sélection levée.
// Un nombre qui contredit un nombre croisé déjà posé n'est pas posé : rien ne change, la sélection
// reste, et les cases en conflit clignotent (signal « conflit »).
// Un nombre barré (déjà utilisé) se touche comme les autres : le placer ailleurs le déplace (ses
// anciennes cases sont signalées brièvement). Un nombre posé dans un emplacement pré-placé est
// verrouillé. Un pré-placé n'est jamais sélectionné.

import { structureDe } from './probleme.ts';
import { consequencesPlacement, nombresUtilises } from './regles.ts';
import type { ActionCases, DonneesCases, EtatCases } from './types.ts';

export type Selection =
  | { readonly type: 'aucune' }
  /** « cellule » : case touchée, pour basculer horizontal / vertical en la touchant à nouveau. */
  | { readonly type: 'emplacement'; readonly emplacement: number; readonly cellule: number }
  | { readonly type: 'nombre'; readonly nombre: string };

export const AUCUNE: Selection = { type: 'aucune' };

/**
 * Signal visuel bref sur des cases :
 * - deplacement : cases quittées par un nombre déplacé (pose acceptée) ;
 * - conflit : cases où le nombre croisé contredit le nombre refusé (pose refusée).
 */
export type Signal = {
  readonly type: 'deplacement' | 'conflit';
  readonly cases: readonly number[];
};

/** Résultat d'un toucher : nouvelle sélection, action à jouer (ou null) et signal à montrer (ou null). */
export type Reaction = {
  readonly selection: Selection;
  readonly action: ActionCases | null;
  readonly signal: Signal | null;
};

/** Toucher sans effet sur l'état. */
function selectionSeule(selection: Selection): Reaction {
  return { selection, action: null, signal: null };
}

/**
 * Pose demandée d'un nombre dans un emplacement. Acceptée : l'action est jouée tout de suite et la
 * sélection levée. Refusée pour conflit : rien n'est joué, la sélection reste, les cases en conflit
 * sont signalées. Autre refus (déjà là, verrouillé…) : sans effet.
 */
export function poser(selection: Selection, etat: EtatCases, donnees: DonneesCases, emplacement: number, nombre: string): Reaction {
  const c = consequencesPlacement(etat, donnees, emplacement, nombre);
  if (!c.possible) {
    return { selection, action: null, signal: c.conflits.length > 0 ? { type: 'conflit', cases: c.conflits } : null };
  }
  const { grille } = structureDe(donnees).probleme;
  // Cases quittées par le nombre déplacé (celles qu'il occupe à nouveau ne sont pas signalées)
  const nouvelles = new Set(grille.emplacements[emplacement]?.cellules ?? []);
  const quittees =
    c.deplaceDepuis === null ? [] : (grille.emplacements[c.deplaceDepuis]?.cellules ?? []).filter((cel) => !nouvelles.has(cel));
  return {
    selection: AUCUNE,
    action: { type: 'placer', emplacement, nombre },
    signal: quittees.length > 0 ? { type: 'deplacement', cases: quittees } : null,
  };
}

/** Emplacements modifiables (non pré-placés) qui passent par une case, l'horizontal d'abord. */
function emplacementsModifiables(donnees: DonneesCases, cellule: number): number[] {
  const { grille } = structureDe(donnees).probleme;
  const fixes = new Set(donnees.preplaces);
  // parCase est rangé par numéro d'emplacement : à première case égale, l'horizontal d'abord ;
  // sinon on trie explicitement par sens
  return [...(grille.parCase[cellule] ?? [])]
    .filter((id) => !fixes.has(id))
    .sort((a, b) => (grille.emplacements[a]?.sens === 'horizontal' ? 0 : 1) - (grille.emplacements[b]?.sens === 'horizontal' ? 0 : 1));
}

/** Emplacements vides et modifiables de la longueur d'un nombre (cibles du mode « nombre d'abord »). */
export function emplacementsCibles(etat: EtatCases, donnees: DonneesCases, nombre: string): number[] {
  const { grille } = structureDe(donnees).probleme;
  const fixes = new Set(donnees.preplaces);
  return grille.emplacements
    .filter((e) => e.cellules.length === nombre.length && !fixes.has(e.id) && (etat.places[e.id] ?? null) === null)
    .map((e) => e.id);
}

/** Vrai si le nombre est posé dans un emplacement pré-placé (il ne se déplace pas). */
export function estVerrouille(etat: EtatCases, donnees: DonneesCases, nombre: string): boolean {
  return donnees.preplaces.some((id) => etat.places[id] === nombre);
}

/** Toucher une case (ou une case noire, ou la marge : cellule = null). */
export function toucherCase(selection: Selection, etat: EtatCases, donnees: DonneesCases, cellule: number | null): Reaction {
  const possibles = cellule === null ? [] : emplacementsModifiables(donnees, cellule);
  if (cellule === null || possibles.length === 0) return selectionSeule(AUCUNE);

  if (selection.type === 'nombre') {
    const cibles = new Set(emplacementsCibles(etat, donnees, selection.nombre));
    const cible = possibles.find((id) => cibles.has(id));
    if (cible !== undefined) return poser(selection, etat, donnees, cible, selection.nombre);
  }

  // Même case touchée à nouveau : emplacement suivant (vertical ↔ horizontal)
  const meme = selection.type === 'emplacement' && selection.cellule === cellule;
  const rang = meme ? (possibles.indexOf(selection.emplacement) + 1) % possibles.length : 0;
  return selectionSeule({ type: 'emplacement', emplacement: possibles[rang] ?? possibles[0] ?? 0, cellule });
}

/** Toucher un nombre de la liste. */
export function toucherNombre(selection: Selection, etat: EtatCases, donnees: DonneesCases, nombre: string): Reaction {
  if (estVerrouille(etat, donnees, nombre)) return selectionSeule(selection);
  if (selection.type === 'emplacement') {
    const e = structureDe(donnees).probleme.grille.emplacements[selection.emplacement];
    if (e === undefined || e.cellules.length !== nombre.length || etat.places[selection.emplacement] === nombre) {
      return selectionSeule(selection); // autre longueur (estompé) ou déjà là : sans effet
    }
    return poser(selection, etat, donnees, selection.emplacement, nombre);
  }
  if (selection.type === 'nombre' && selection.nombre === nombre) return selectionSeule(AUCUNE);
  return selectionSeule({ type: 'nombre', nombre });
}

/** Bouton « Effacer » : vide l'emplacement sélectionné, ou celui du nombre sélectionné. */
export function actionEffacer(selection: Selection, etat: EtatCases, donnees: DonneesCases): ActionCases | null {
  const fixes = new Set(donnees.preplaces);
  const emplacement =
    selection.type === 'emplacement'
      ? selection.emplacement
      : selection.type === 'nombre'
        ? etat.places.indexOf(selection.nombre)
        : -1;
  if (emplacement < 0 || fixes.has(emplacement) || (etat.places[emplacement] ?? null) === null) return null;
  return { type: 'effacer', emplacement };
}

/** Sélection encore valable après un changement d'état (annuler, indice…) ; sinon aucune. */
export function selectionValide(selection: Selection, etat: EtatCases, donnees: DonneesCases): Selection {
  if (selection.type === 'nombre' && estVerrouille(etat, donnees, selection.nombre)) return AUCUNE;
  return selection;
}

// ---------- Liste des nombres ----------

/** État d'un nombre dans la liste. libre / utilise (barré, déplaçable) / verrouille (barré, pré-placé). */
export type EtatNombre = 'libre' | 'utilise' | 'verrouille';

export type NombreListe = {
  readonly texte: string;
  readonly etat: EtatNombre;
  /** Autre longueur que l'emplacement sélectionné : estompé et sans effet. */
  readonly estompe: boolean;
  /** Nombre sélectionné, ou posé dans l'emplacement sélectionné. */
  readonly choisi: boolean;
};

export type GroupeListe = {
  readonly longueur: number;
  /** Groupe de la longueur de la sélection : affiché en premier et surligné. */
  readonly enAvant: boolean;
  readonly nombres: readonly NombreListe[];
};

/** Longueur visée par la sélection (emplacement ou nombre), ou null. */
export function longueurSelection(selection: Selection, donnees: DonneesCases): number | null {
  if (selection.type === 'nombre') return selection.nombre.length;
  if (selection.type === 'emplacement') {
    return structureDe(donnees).probleme.grille.emplacements[selection.emplacement]?.cellules.length ?? null;
  }
  return null;
}

/** Liste groupée par longueur ; le groupe de la sélection en tête, les autres par longueur croissante. */
export function groupesListe(selection: Selection, etat: EtatCases, donnees: DonneesCases): GroupeListe[] {
  const { probleme: p } = structureDe(donnees);
  const utilises = new Set(nombresUtilises(etat, donnees));
  const verrouilles = new Set(donnees.preplaces.map((id) => etat.places[id] ?? ''));
  const longueur = longueurSelection(selection, donnees);
  const dansSelection = selection.type === 'emplacement' ? (etat.places[selection.emplacement] ?? null) : null;
  const groupes = p.longueurs.map((l) => ({
    longueur: l,
    enAvant: l === longueur,
    nombres: (p.nombresParLongueur.get(l) ?? []).map((i): NombreListe => {
      const texte = p.nombres[i] ?? '';
      return {
        texte,
        etat: verrouilles.has(texte) ? 'verrouille' : utilises.has(texte) ? 'utilise' : 'libre',
        estompe: selection.type === 'emplacement' && l !== longueur,
        choisi: selection.type === 'nombre' ? selection.nombre === texte : dansSelection === texte,
      };
    }),
  }));
  return [...groupes.filter((g) => g.enAvant), ...groupes.filter((g) => !g.enAvant)];
}

// ---------- Mises en évidence de la grille ----------

/** Cases à mettre en évidence pour la sélection : l'emplacement choisi, ou les cibles du nombre. */
export function casesEnEvidence(
  selection: Selection,
  etat: EtatCases,
  donnees: DonneesCases,
): { readonly selection: ReadonlySet<number>; readonly cibles: ReadonlySet<number> } {
  const { grille } = structureDe(donnees).probleme;
  const cellulesDe = (ids: readonly number[]): Set<number> =>
    new Set(ids.flatMap((id) => grille.emplacements[id]?.cellules ?? []));
  if (selection.type === 'emplacement') return { selection: cellulesDe([selection.emplacement]), cibles: new Set() };
  if (selection.type === 'nombre') return { selection: new Set(), cibles: cellulesDe(emplacementsCibles(etat, donnees, selection.nombre)) };
  return { selection: new Set(), cibles: new Set() };
}

/**
 * Flèches du clavier : la case voisine (cases noires sautées) devient la case touchée, et son
 * emplacement dans le sens de la flèche est préféré (← → : horizontal ; ↑ ↓ : vertical).
 */
export function selectionParFleche(selection: Selection, donnees: DonneesCases, dl: number, dc: number): Selection {
  const depart = selection.type === 'emplacement' ? selection.cellule : null;
  const premiere = donnees.solution.findIndex((v) => v >= 0);
  const cellule = depart === null ? premiere : (caseVoisine(donnees, depart, dl, dc) ?? depart);
  const possibles = emplacementsModifiables(donnees, cellule);
  if (possibles.length === 0) return selection.type === 'emplacement' ? selection : AUCUNE;
  const { grille } = structureDe(donnees).probleme;
  const sens = dc !== 0 ? 'horizontal' : 'vertical';
  const prefere = possibles.find((id) => grille.emplacements[id]?.sens === sens) ?? possibles[0] ?? 0;
  return { type: 'emplacement', emplacement: prefere, cellule };
}

/** Case voisine dans une direction (flèches du clavier), ou null au bord. Les cases noires sont sautées. */
export function caseVoisine(donnees: DonneesCases, depart: number, dl: number, dc: number): number | null {
  const { largeur, hauteur, solution } = donnees;
  let l = Math.floor(depart / largeur) + dl;
  let c = (depart % largeur) + dc;
  while (l >= 0 && l < hauteur && c >= 0 && c < largeur) {
    const cellule = l * largeur + c;
    if ((solution[cellule] ?? -1) >= 0) return cellule;
    l += dl;
    c += dc;
  }
  return null;
}
