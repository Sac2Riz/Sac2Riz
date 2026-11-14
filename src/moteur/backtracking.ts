// Solveur par backtracking (« retour sur trace ») : essaie une valeur, continue,
// et revient en arrière en cas d'impasse. Il sert à :
//   - compter les solutions d'une grille (arrêt dès la limite, 2 en général) → unicité ;
//   - remplir une grille vide au hasard (générateur).
// Heuristique MRV (« minimum remaining values ») : on remplit toujours d'abord la case
// qui a le moins de candidats, ce qui réduit énormément l'arbre de recherche.
//
// Pureté : les tableaux de travail sont LOCAUX et modifiés pendant la recherche (pour la vitesse),
// mais les arguments ne sont jamais modifiés et le résultat est un nouvel objet. Code pur.

import type { Alea } from '../types/alea.ts';
import type { DefinitionGrille, ValeursGrille } from '../types/grille.ts';
import { compterBits, masqueDe, valeursDuMasque } from './candidats.ts';
import { compiler, type Structure } from './structure.ts';

export type OptionsComptage = {
  /** On s'arrête dès qu'on a trouvé ce nombre de solutions (2 suffit pour tester l'unicité). */
  readonly limite: number;
  /** Nombre maximal de nœuds explorés avant d'abandonner (garde-fou contre les recherches trop longues). */
  readonly noeudsMax: number;
  /** Si fourni, les valeurs sont essayées dans un ordre aléatoire (remplissage au hasard). */
  readonly alea: Alea | null;
};

export type ResultatComptage = {
  /** Nombre de solutions trouvées (au plus « limite »). */
  readonly nombre: number;
  /** Première solution trouvée, ou null. */
  readonly solution: number[] | null;
  /** Vrai si la recherche a été arrêtée par noeudsMax : « nombre » n'est alors qu'un minimum. */
  readonly interrompu: boolean;
  /** Nombre de nœuds explorés (utile aux mesures). */
  readonly noeuds: number;
};

const OPTIONS_PAR_DEFAUT: OptionsComptage = {
  limite: 2,
  noeudsMax: Number.POSITIVE_INFINITY,
  alea: null,
};

/** Somme des k plus petites (ou plus grandes) valeurs d'un masque ; -1 s'il y en a moins de k. */
function sommeExtremeMasque(masque: number, k: number, plusGrandes: boolean): number {
  const valeurs = valeursDuMasque(masque);
  if (valeurs.length < k) return -1;
  let somme = 0;
  for (let i = 0; i < k; i++) {
    somme += (plusGrandes ? valeurs[valeurs.length - 1 - i] : valeurs[i]) ?? 0;
  }
  return somme;
}

/** Comme compterSolutions, à partir d'une structure déjà compilée (évite de recompiler en boucle). */
export function compterSolutionsAvec(
  structure: Structure,
  valeurs: ValeursGrille,
  options: Partial<OptionsComptage> = {},
): ResultatComptage {
  const { limite, noeudsMax, alea } = { ...OPTIONS_PAR_DEFAUT, ...options };
  const { nombreCellules, cellulesRegion, regionsCellule, distincte, total, dansUneSomme, masqueValeurs, domaine } =
    structure;
  if (valeurs.length !== nombreCellules) {
    throw new Error(`Grille de ${valeurs.length} cases au lieu de ${nombreCellules}`);
  }
  const valeurMin = structure.valeurs[0] ?? 0;
  const valeurMax = structure.valeurs[structure.valeurs.length - 1] ?? 0;
  const nombreRegions = cellulesRegion.length;

  // ---- État de travail (local) ----
  const grille = new Int32Array(nombreCellules);
  const utilises = new Int32Array(nombreRegions); // valeurs déjà placées (masque), régions distinctes
  const somme = new Int32Array(nombreRegions); // somme des valeurs placées, régions somme
  const vides = new Int32Array(nombreRegions); // nombre de cases vides de chaque région
  cellulesRegion.forEach((cellules, r) => (vides[r] = cellules.length));

  let nombre = 0;
  let solution: number[] | null = null;
  let noeuds = 0;
  let interrompu = false;
  const aucune: ResultatComptage = { nombre: 0, solution: null, interrompu: false, noeuds: 0 };

  function placer(c: number, v: number): void {
    grille[c] = v;
    const bit = masqueDe(v);
    for (const r of regionsCellule[c] ?? []) {
      utilises[r] = (utilises[r] ?? 0) | bit;
      somme[r] = (somme[r] ?? 0) + v;
      vides[r] = (vides[r] ?? 0) - 1;
    }
  }

  function retirer(c: number, v: number): void {
    grille[c] = 0;
    const bit = masqueDe(v);
    for (const r of regionsCellule[c] ?? []) {
      utilises[r] = (utilises[r] ?? 0) & ~bit;
      somme[r] = (somme[r] ?? 0) - v;
      vides[r] = (vides[r] ?? 0) + 1;
    }
  }

  /** Vrai si placer v en c laisse la région somme r réalisable. */
  function sommePossible(r: number, v: number): boolean {
    const reste = (total[r] ?? 0) - (somme[r] ?? 0) - v;
    const k = (vides[r] ?? 0) - 1; // cases encore vides après ce placement
    if (k === 0) return reste === 0;
    if (reste <= 0) return false;
    if (distincte[r] === 1) {
      const dispo = masqueValeurs & ~(utilises[r] ?? 0) & ~masqueDe(v);
      const min = sommeExtremeMasque(dispo, k, false);
      return min !== -1 && min <= reste && reste <= sommeExtremeMasque(dispo, k, true);
    }
    return k * valeurMin <= reste && reste <= k * valeurMax;
  }

  /** Candidats actuels d'une case vide. */
  function candidats(c: number): number {
    const regions = regionsCellule[c] ?? new Int32Array(0);
    let masque = domaine[c] ?? 0;
    for (const r of regions) if (distincte[r] === 1) masque &= ~(utilises[r] ?? 0);
    if (dansUneSomme[c] === 1 && masque !== 0) {
      for (const r of regions) {
        if ((total[r] ?? -1) < 0) continue;
        for (const v of valeursDuMasque(masque)) {
          if (!sommePossible(r, v)) masque &= ~masqueDe(v);
        }
      }
    }
    return masque;
  }

  // ---- Placement des chiffres donnés ----
  for (let c = 0; c < nombreCellules; c++) {
    const v = valeurs[c] ?? 0;
    if (v === 0) continue;
    if (!Number.isInteger(v) || v < 1 || v > 31 || ((domaine[c] ?? 0) & masqueDe(v)) === 0) return aucune;
    for (const r of regionsCellule[c] ?? []) {
      if (distincte[r] === 1 && ((utilises[r] ?? 0) & masqueDe(v)) !== 0) return aucune;
    }
    placer(c, v);
  }
  for (let r = 0; r < nombreRegions; r++) {
    const t = total[r] ?? -1;
    if (t < 0) continue;
    const s = somme[r] ?? 0;
    if (s > t || ((vides[r] ?? 0) === 0 && s !== t)) return aucune;
  }

  /** Recherche récursive ; renvoie vrai s'il faut tout arrêter (limite atteinte ou interruption). */
  function chercher(): boolean {
    noeuds++;
    if (noeuds > noeudsMax) {
      interrompu = true;
      return true;
    }
    // Case vide ayant le moins de candidats
    let meilleure = -1;
    let meilleurMasque = 0;
    let meilleurCompte = Number.POSITIVE_INFINITY;
    for (let c = 0; c < nombreCellules; c++) {
      if (grille[c] !== 0) continue;
      const masque = candidats(c);
      if (masque === 0) return false; // impasse
      const compte = compterBits(masque);
      if (compte < meilleurCompte) {
        meilleure = c;
        meilleurMasque = masque;
        meilleurCompte = compte;
        if (compte === 1) break;
      }
    }
    if (meilleure === -1) {
      // Plus de case vide : solution trouvée
      nombre++;
      if (solution === null) solution = Array.from(grille);
      return nombre >= limite;
    }
    const essais = valeursDuMasque(meilleurMasque);
    for (const v of alea ? alea.melanger(essais) : essais) {
      placer(meilleure, v);
      const arreter = chercher();
      retirer(meilleure, v);
      if (arreter) return true;
    }
    return false;
  }

  chercher();
  return { nombre, solution, interrompu, noeuds };
}

/** Compte les solutions d'une grille (0 = case vide), en s'arrêtant à options.limite (2 par défaut). */
export function compterSolutions(
  definition: DefinitionGrille,
  valeurs: ValeursGrille,
  options: Partial<OptionsComptage> = {},
): ResultatComptage {
  return compterSolutionsAvec(compiler(definition), valeurs, options);
}

/** Vrai si la grille a exactement une solution. */
export function estUnique(definition: DefinitionGrille, valeurs: ValeursGrille): boolean {
  const resultat = compterSolutions(definition, valeurs, { limite: 2 });
  return resultat.nombre === 1 && !resultat.interrompu;
}
