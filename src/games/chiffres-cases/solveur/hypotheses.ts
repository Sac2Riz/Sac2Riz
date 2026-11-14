// HYPOTHÈSES : logique partagée par « consequence » et « forcing » (Diabolique). Code pur.
//
// On examine TOUTES les possibilités d'un choix (les 2 ou 3 nombres d'un emplacement, ou les 2 ou 3
// emplacements d'un nombre). Dans chaque branche, on enchaîne des techniques plus simples jusqu'au
// blocage.
// - IMPASSE COURTE : une branche qui aboutit à une impasse en au plus IMPASSE_ETAPES_MAX déductions
//   SIMPLES (longueur unique, un seul nombre possible, une seule place) : cette possibilité est
//   éliminée. C'est le raisonnement « si 345 allait ici, la colonne n'aurait plus aucun nombre
//   possible ». Sans lui, ces techniques ne servent presque jamais dans ce jeu (mesure de l'étape 4a).
//   La borne garantit qu'il reste un raisonnement qu'on peut suivre de tête, jamais une
//   résolution complète déguisée (voir docs/DIFFICULTE.md, différence avec le sudoku).
// - Sinon, ce qui est vrai dans toutes les branches (nombre placé, nombre impossible) est retenu.
//   Si une branche n'aboutit à une impasse qu'au-delà de la borne, le choix est abandonné : en
//   tirer une conclusion reviendrait à un raisonnement par l'absurde trop long.

import { nomEmplacement } from '../grille.ts';
import type { Probleme } from '../probleme.ts';
import {
  contradiction,
  eliminer,
  emplacementsLibres,
  estResolu,
  nombresLibres,
  placer,
  type EliminationSolveur,
  type EtatSolveur,
  type PlacementSolveur,
} from './etat.ts';
import { construireEtape, enumerer, textes, type EtapeCases, type TechniqueCases } from './technique.ts';
import { longueurUnique } from './techniques/longueur-unique.ts';
import { motifUnique } from './techniques/motif-unique.ts';
import { placeUnique } from './techniques/place-unique.ts';

/**
 * Nombre maximal de déductions simples avant l'impasse (0 = impasse immédiate : le choix laisse un
 * emplacement sans nombre possible). Mesuré à l'étape 4a (voir docs/DIFFICULTE.md).
 */
export const IMPASSE_ETAPES_MAX = 3;

/** Seules techniques permises pour atteindre une impasse (Débutant et Facile). */
export const TECHNIQUES_IMPASSE: readonly TechniqueCases[] = [longueurUnique, motifUnique, placeUnique];

export type ResultatPropagation = {
  readonly statut: 'resolu' | 'bloque' | 'contradiction';
  readonly etat: EtatSolveur;
  /** Nombre d'étapes appliquées. */
  readonly etapes: number;
};

/** Applique une étape à un état. */
export function appliquerEtape(p: Probleme, etat: EtatSolveur, etape: EtapeCases): EtatSolveur {
  let suivant = eliminer(etat, etape.eliminations);
  for (const { emplacement, nombre } of etape.placements) suivant = placer(p, suivant, emplacement, nombre);
  return suivant;
}

/**
 * Enchaîne les techniques fournies (la plus simple d'abord) jusqu'au blocage, ou jusqu'à
 * etapesMax étapes (statut « bloque » si la borne est atteinte sans conclusion).
 */
export function propager(
  p: Probleme,
  depart: EtatSolveur,
  techniques: readonly TechniqueCases[],
  etapesMax: number = Number.POSITIVE_INFINITY,
): ResultatPropagation {
  let etat = depart;
  for (let etapes = 0; ; etapes++) {
    if (contradiction(p, etat)) return { statut: 'contradiction', etat, etapes };
    if (estResolu(etat)) return { statut: 'resolu', etat, etapes };
    if (etapes >= etapesMax) return { statut: 'bloque', etat, etapes };
    let etape: EtapeCases | null = null;
    for (const t of techniques) {
      etape = t.chercher(p, etat);
      if (etape !== null) break;
    }
    if (etape === null) return { statut: 'bloque', etat, etapes };
    etat = appliquerEtape(p, etat, etape);
  }
}

/** Une branche : sa description (« si 345 va dans … ») et l'état juste après le choix. */
type Branche = {
  readonly description: string;
  readonly etat: EtatSolveur;
  /** Ce qu'il faut éliminer si cette branche mène à une impasse. */
  readonly elimination: EliminationSolveur;
};

/** Un choix et toutes ses possibilités. */
type Choix = { readonly motif: readonly number[]; readonly intitule: string; readonly branches: readonly Branche[] };

export type OptionsHypotheses = {
  /** Nombre maximal de possibilités par choix (2 ou 3). */
  readonly possibilitesMax: number;
  /** Envisager aussi « les emplacements possibles d'un nombre » (sinon seulement les nombres d'un emplacement). */
  readonly parNombre: boolean;
  /** Techniques enchaînées dans chaque branche pour trouver des conclusions communes. */
  readonly techniques: readonly TechniqueCases[];
  /**
   * Exploiter une branche qui mène à une impasse COURTE (au plus impasseEtapesMax déductions
   * simples) : la possibilité correspondante est éliminée.
   */
  readonly absurde: boolean;
  readonly impasseEtapesMax: number;
};

/** « immédiatement », « après 1 déduction simple », « après 3 déductions simples ». */
function delaiImpasse(etapes: number): string {
  if (etapes === 0) return 'immédiatement';
  return `après ${etapes} déduction${etapes > 1 ? 's' : ''} simple${etapes > 1 ? 's' : ''}`;
}

function choixPossibles(p: Probleme, etat: EtatSolveur, options: OptionsHypotheses): Choix[] {
  const parEmplacement: Choix[] = [];
  const parNombre: Choix[] = [];
  for (const e of p.grille.emplacements) {
    const c = etat.candidats[e.id] ?? [];
    if ((etat.affectes[e.id] ?? -1) >= 0 || c.length < 2 || c.length > options.possibilitesMax) continue;
    const nom = nomEmplacement(p.grille, e.id);
    parEmplacement.push({
      motif: [e.id],
      intitule: `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ne peut recevoir que ${enumerer(textes(p, c), 'ou')}.`,
      branches: c.map((n) => ({
        description: `si ${p.nombres[n] ?? ''} y allait`,
        etat: placer(p, etat, e.id, n),
        elimination: { emplacement: e.id, nombres: [n] },
      })),
    });
  }
  if (options.parNombre) {
    for (const longueur of p.longueurs) {
      const libres = emplacementsLibres(p, etat, longueur);
      for (const n of nombresLibres(p, etat, longueur)) {
        const places = libres.filter((id) => etat.candidats[id]?.includes(n) === true);
        if (places.length < 2 || places.length > options.possibilitesMax) continue;
        parNombre.push({
          motif: places,
          intitule: `Le nombre ${p.nombres[n] ?? ''} ne peut aller que dans ${enumerer(places.map((id) => nomEmplacement(p.grille, id)), 'ou')}.`,
          branches: places.map((id) => ({
            description: `s'il allait dans ${nomEmplacement(p.grille, id)}`,
            etat: placer(p, etat, id, n),
            elimination: { emplacement: id, nombres: [n] },
          })),
        });
      }
    }
  }
  // Les choix à deux possibilités d'abord (plus faciles à suivre pour un joueur)
  return [...parEmplacement, ...parNombre].sort((a, b) => a.branches.length - b.branches.length);
}

/** Ce qui est vrai dans toutes les branches, par rapport à l'état de départ. */
function conclusionsCommunes(
  p: Probleme,
  depart: EtatSolveur,
  finales: readonly EtatSolveur[],
): { placements: PlacementSolveur[]; eliminations: EliminationSolveur[] } {
  const placements: PlacementSolveur[] = [];
  const eliminations: EliminationSolveur[] = [];
  for (const e of p.grille.emplacements) {
    if ((depart.affectes[e.id] ?? -1) >= 0) continue;
    const premier = finales[0]?.affectes[e.id] ?? -1;
    if (premier >= 0 && finales.every((f) => f.affectes[e.id] === premier)) {
      placements.push({ emplacement: e.id, nombre: premier });
      continue;
    }
    const impossibles = (depart.candidats[e.id] ?? []).filter((n) =>
      finales.every((f) => !(f.candidats[e.id] ?? []).includes(n)),
    );
    if (impossibles.length > 0) eliminations.push({ emplacement: e.id, nombres: impossibles });
  }
  return { placements, eliminations };
}

function conclusionEnTexte(p: Probleme, placements: readonly PlacementSolveur[], eliminations: readonly EliminationSolveur[]): string {
  const premier = placements[0];
  if (premier !== undefined) {
    const autres = placements.length - 1;
    return `${nomEmplacement(p.grille, premier.emplacement)} contient ${p.nombres[premier.nombre] ?? ''}${autres > 0 ? ` (et ${autres} autre${autres > 1 ? 's' : ''} nombre${autres > 1 ? 's' : ''} se placent de même)` : ''}`;
  }
  const textesElim = eliminations
    .slice(0, 3)
    .map((e) => `${enumerer(textes(p, e.nombres))} ne ${e.nombres.length > 1 ? 'peuvent' : 'peut'} pas aller dans ${nomEmplacement(p.grille, e.emplacement)}`);
  return `${enumerer(textesElim)}${eliminations.length > 3 ? ', entre autres' : ''}`;
}

/** Cherche le premier choix dont toutes les branches mènent à une même conclusion utile. */
export function chercherHypothese(
  technique: Pick<TechniqueCases, 'id' | 'niveau'>,
  p: Probleme,
  etat: EtatSolveur,
  options: OptionsHypotheses,
  resumeDeductions: string,
): EtapeCases | null {
  for (const choix of choixPossibles(p, etat, options)) {
    // 1. Impasse courte (seulement si le raisonnement par impasse est permis)
    if (options.absurde) {
      let etapeImpasse: EtapeCases | null = null;
      for (const branche of choix.branches) {
        const r = propager(p, branche.etat, TECHNIQUES_IMPASSE, options.impasseEtapesMax);
        if (r.statut !== 'contradiction') continue;
        etapeImpasse = construireEtape(
          technique,
          etat,
          choix.motif,
          [],
          [branche.elimination],
          `${choix.intitule} Mais ${branche.description}, on aboutirait ${delaiImpasse(r.etapes)} à une impasse (un emplacement sans nombre possible) : ${textes(p, branche.elimination.nombres).join('')} est donc impossible dans ${nomEmplacement(p.grille, branche.elimination.emplacement)}.`,
        );
        if (etapeImpasse !== null) break;
      }
      if (etapeImpasse !== null) return etapeImpasse;
    }

    // 2. Conclusions communes à toutes les branches (aucune ne doit mener à une impasse)
    const finales: EtatSolveur[] = [];
    let impasse = false;
    for (const branche of choix.branches) {
      const r = propager(p, branche.etat, options.techniques);
      if (r.statut === 'contradiction') {
        impasse = true;
        break;
      }
      finales.push(r.etat);
    }
    if (impasse) continue;
    const { placements, eliminations } = conclusionsCommunes(p, etat, finales);
    // On ne garde que ce qui est vraiment nouveau (effet réel)
    const etape = construireEtape(
      technique,
      etat,
      choix.motif,
      placements,
      eliminations,
      `${choix.intitule} Dans chaque cas, ${resumeDeductions}, on trouve que ${conclusionEnTexte(p, placements, eliminations)}.`,
    );
    if (etape !== null) return etape;
  }
  return null;
}
