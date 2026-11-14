// GÉNÉRATION PAR NIVEAU des chiffres casés. Code pur. Voir docs/DIFFICULTE.md.
//
// Un essai = un motif de cases noires (motif.ts) et des chiffres au hasard (remplissage.ts), puis une
// « marche » d'au plus `pas` étapes. À chaque étape, la grille est résolue avec les techniques du
// niveau visé (jamais plus) :
// - résolue au niveau visé → c'est gagné (une résolution logique complète prouve l'unicité) ;
// - résolue mais trop facile → on retire un pré-placé (s'il y en a plus que le minimum), sinon on
//   modifie un chiffre au hasard ;
// - bloquée (ambiguë, ou trop dure pour le niveau) → on pré-place un emplacement encore vide (dans
//   la limite du niveau), sinon on modifie un chiffre d'un emplacement encore vide.
// Les grilles dures sont rares au hasard : elles se trouvent « à la limite de l'ambiguïté », d'où
// ces petites modifications successives. Pour Expert et Diabolique, une grille bloquée au niveau
// Difficile n'est examinée avec les techniques coûteuses que si elle n'a qu'une solution
// (backtracking, rapide) ; sinon on la modifie tout de suite.

import type { Alea } from '../../types/alea.ts';
import { NIVEAUX, type Niveau, type Notation } from '../../types/niveaux.ts';
import { compterSolutions } from './backtracking.ts';
import { nombreDe, type Grille } from './grille.ts';
import { genererMotif } from './motif.ts';
import { noterEtapes } from './notation.ts';
import { creerProbleme, type Probleme } from './probleme.ts';
import { remplir } from './remplissage.ts';
import { etatDepart, type PlacementSolveur } from './solveur/etat.ts';
import { resoudre, type ResultatSolveur } from './solveur/solveur.ts';
import type { DonneesCases } from './types.ts';

export type ParametresNiveau = {
  readonly largeur: number;
  readonly hauteur: number;
  /** Part visée de cases noires. */
  readonly densite: number;
  readonly longueurMax: number;
  readonly preplacesMin: number;
  readonly preplacesMax: number;
  /** Chiffres favoris (voir remplissage.ts) : 0 = tirage uniforme. */
  readonly favoris: number;
  readonly partFavoris: number;
  /** Nombre maximal d'étapes de la marche par essai. */
  readonly pas: number;
};

/** Paramètres de génération de chaque niveau (mesurés : voir docs/DIFFICULTE.md). */
export const PARAMETRES_NIVEAUX: Readonly<Record<Niveau, ParametresNiveau>> = {
  debutant: { largeur: 7, hauteur: 7, densite: 0.3, longueurMax: 5, preplacesMin: 2, preplacesMax: 3, favoris: 0, partFavoris: 0, pas: 30 },
  facile: { largeur: 9, hauteur: 9, densite: 0.3, longueurMax: 6, preplacesMin: 1, preplacesMax: 2, favoris: 0, partFavoris: 0, pas: 30 },
  moyen: { largeur: 9, hauteur: 9, densite: 0.28, longueurMax: 6, preplacesMin: 0, preplacesMax: 1, favoris: 3, partFavoris: 0.5, pas: 30 },
  difficile: { largeur: 11, hauteur: 11, densite: 0.25, longueurMax: 7, preplacesMin: 0, preplacesMax: 1, favoris: 3, partFavoris: 0.6, pas: 60 },
  expert: { largeur: 11, hauteur: 11, densite: 0.22, longueurMax: 7, preplacesMin: 0, preplacesMax: 1, favoris: 3, partFavoris: 0.6, pas: 100 },
  diabolique: { largeur: 11, hauteur: 11, densite: 0.22, longueurMax: 7, preplacesMin: 0, preplacesMax: 1, favoris: 3, partFavoris: 0.6, pas: 300 },
};

/** Sans budget de temps (bench, script des packs), nombre maximal d'essais par défaut. */
export const TENTATIVES_MAX_SANS_BUDGET = 100;

const RANG_DIFFICILE = NIVEAUX.indexOf('difficile');

/** Grille trop facile : part des modifications qui rapprochent deux nombres (les autres sont au hasard). */
const PART_RAPPROCHEMENTS = 0.7;

export type OptionsGenerationCases = {
  /** Budget de temps (worker) : consulté avant chaque essai sauf le premier, et entre deux étapes d'un essai. */
  readonly doitArreter: (() => boolean) | null;
  /** Nombre maximal d'essais ; null = aucune limite (seulement avec doitArreter). */
  readonly tentativesMax: number | null;
  /** Paramètres à utiliser à la place de ceux du niveau (bench). */
  readonly parametres: ParametresNiveau | null;
};

export type ResultatGenerationCases =
  | { readonly ok: true; readonly donnees: DonneesCases; readonly notation: Notation; readonly essais: number }
  | { readonly ok: false; readonly raison: string; readonly essais: number };

type Essai = { readonly donnees: DonneesCases; readonly notation: Notation };

/**
 * Résout avec les techniques du niveau. Au-delà de Difficile, une grille bloquée au niveau
 * Difficile qui a plusieurs solutions n'est pas examinée plus loin (techniques coûteuses inutiles).
 */
function analyser(p: Probleme, donnes: readonly PlacementSolveur[], niveau: Niveau): ResultatSolveur {
  const depart = etatDepart(p, donnes);
  if (NIVEAUX.indexOf(niveau) <= RANG_DIFFICILE) return resoudre(p, depart, niveau);
  const r = resoudre(p, depart, 'difficile');
  if (r.statut !== 'bloque' || compterSolutions(p, r.etat).nombre > 1) return r;
  // Le solveur essaie toujours les techniques dans le même ordre : reprendre là où il s'est
  // arrêté donne exactement les mêmes étapes qu'une résolution depuis le début.
  const suite = resoudre(p, r.etat, niveau);
  return { ...suite, etapes: [...r.etapes, ...suite.etapes] };
}

/** Modifie un chiffre d'une des cases fournies, en gardant tous les nombres différents. */
function muter(grille: Grille, chiffres: readonly number[], cellules: readonly number[], alea: Alea): number[] {
  const premieres = new Set(grille.emplacements.map((e) => e.cellules[0] ?? -1));
  for (let essai = 0; essai < 20 && cellules.length > 0; essai++) {
    const c = cellules[alea.entier(cellules.length)] ?? 0;
    const copie = [...chiffres];
    copie[c] = premieres.has(c) ? 1 + alea.entier(9) : alea.entier(10);
    const textes = grille.emplacements.map((e) => nombreDe(e, copie));
    if (new Set(textes).size === textes.length) return copie;
  }
  return [...chiffres];
}

/**
 * Rapproche deux nombres de même longueur : un chiffre de l'un est recopié dans l'autre. La grille
 * devient plus ambiguë (pousse la marche vers les grilles dures). Renvoie une copie.
 */
function rapprocher(grille: Grille, chiffres: readonly number[], alea: Alea): number[] {
  const { emplacements } = grille;
  for (let essai = 0; essai < 20; essai++) {
    const a = emplacements[alea.entier(emplacements.length)];
    if (a === undefined) break;
    const memes = emplacements.filter((e) => e.id !== a.id && e.cellules.length === a.cellules.length);
    const b = memes[alea.entier(memes.length)];
    if (b === undefined) continue;
    const differences = a.cellules.flatMap((c, i) => (chiffres[c] !== chiffres[b.cellules[i] ?? 0] ? [i] : []));
    const i = differences[alea.entier(differences.length)];
    if (i === undefined || differences.length < 2) continue; // a et b deviendraient identiques
    const copie = [...chiffres];
    copie[a.cellules[i] ?? 0] = chiffres[b.cellules[i] ?? 0] ?? 0;
    const textes = emplacements.map((e) => nombreDe(e, copie));
    // Tous différents, et aucun nombre ne commence par 0 (la case peut ouvrir un autre emplacement)
    if (new Set(textes).size === textes.length && textes.every((t) => !t.startsWith('0'))) return copie;
  }
  return [...chiffres];
}

/** Un essai complet ; null s'il échoue. */
function essayer(niveau: Niveau, params: ParametresNiveau, alea: Alea, doitArreter: () => boolean): Essai | null {
  const grille = genererMotif(params, alea);
  if (grille === null) return null;
  let chiffres = remplir(grille, params, alea);
  if (chiffres === null) return null;
  const ids = grille.emplacements.map((e) => e.id);
  const toutes = grille.emplacements.flatMap((e) => e.cellules);
  const rangVise = NIVEAUX.indexOf(niveau);
  let donnes = alea.melanger(ids).slice(0, params.preplacesMin);

  for (let pas = 0; pas < params.pas; pas++) {
    // Une marche peut être longue : le budget de temps est aussi consulté entre deux étapes
    if (pas > 0 && doitArreter()) return null;
    const textes = grille.emplacements.map((e) => nombreDe(e, chiffres ?? []));
    const p = creerProbleme(grille, textes);
    const solution = textes.map((t) => p.nombres.indexOf(t));
    const placements = donnes.map((emplacement) => ({ emplacement, nombre: solution[emplacement] ?? -1 }));
    const r = analyser(p, placements, niveau);

    if (r.statut === 'resolu') {
      const notation = noterEtapes(p, r.etapes, donnes.length);
      if (notation.niveau === niveau) {
        return {
          donnees: { largeur: grille.largeur, hauteur: grille.hauteur, solution: chiffres, preplaces: [...donnes].sort((a, b) => a - b) },
          notation,
        };
      }
      // Trop facile (jamais trop dur : seules les techniques du niveau sont permises)
      if (NIVEAUX.indexOf(notation.niveau) < rangVise && donnes.length > params.preplacesMin) {
        const retire = donnes[alea.entier(donnes.length)];
        donnes = donnes.filter((id) => id !== retire);
      } else {
        chiffres = alea.suivant() < PART_RAPPROCHEMENTS ? rapprocher(grille, chiffres, alea) : muter(grille, chiffres, toutes, alea);
      }
      continue;
    }

    // Bloquée : pré-placer un emplacement encore vide, ou modifier un de ses chiffres
    const vides = ids.filter((id) => (r.etat.affectes[id] ?? -1) < 0);
    if (donnes.length < params.preplacesMax && vides.length > 0) {
      donnes = [...donnes, vides[alea.entier(vides.length)] ?? 0];
    } else {
      const cellules = vides.flatMap((id) => grille.emplacements[id]?.cellules ?? []);
      chiffres = muter(grille, chiffres, cellules.length > 0 ? cellules : toutes, alea);
    }
  }
  return null;
}

export function genererCases(
  niveau: Niveau,
  alea: Alea,
  options: Partial<OptionsGenerationCases> = {},
): ResultatGenerationCases {
  const doitArreter = options.doitArreter ?? null;
  const tentativesMax =
    options.tentativesMax === undefined ? (doitArreter === null ? TENTATIVES_MAX_SANS_BUDGET : null) : options.tentativesMax;
  if (tentativesMax === null && doitArreter === null) throw new Error('Sans budget de temps, il faut un nombre maximal d\'essais');
  const params = options.parametres ?? PARAMETRES_NIVEAUX[niveau];
  for (let essais = 1; ; essais++) {
    if (essais > 1 && doitArreter !== null && doitArreter()) {
      return { ok: false, raison: 'Budget de temps épuisé', essais: essais - 1 };
    }
    if (tentativesMax !== null && essais > tentativesMax) {
      return { ok: false, raison: `Aucune grille ${niveau} en ${tentativesMax} essais`, essais: tentativesMax };
    }
    const essai = essayer(niveau, params, alea, doitArreter ?? (() => false));
    if (essai !== null) return { ok: true, ...essai, essais };
  }
}
