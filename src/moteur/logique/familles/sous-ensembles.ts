// Famille « sous-ensembles » : paires, triplets et quadruplets, nus et cachés.
//
// - Nu : dans une région, k cases vides dont les candidats réunis ne forment que k valeurs.
//   Ces k valeurs leur sont réservées : on les retire des autres cases de la région.
//   Valable dans toute région à chiffres distincts (y compris une cage « distinctes »).
// - Caché : dans une région COMPLÈTE, k valeurs qui ne peuvent aller que dans k cases.
//   Ces cases ne peuvent contenir rien d'autre : on retire leurs autres candidats.
//   (Une région incomplète n'oblige pas à placer chaque valeur : la règle n'y vaut pas.)
// Code pur.

import type { Cellule } from '../../../types/grille.ts';
import type { EtatLogique, Etape } from '../../../types/logique.ts';
import { compterBits, masqueComplet, valeursDuMasque } from '../../candidats.ts';
import { regionsCompletes, type Contexte } from '../contexte.ts';
import { ensemble, nomRegion, nomsCellules } from '../noms.ts';
import { casesVides, combinaisons, positions, valeursPlacees } from '../outils.ts';
import { candidatsDe, construireEtape, type EliminationBrute, type InfosTechnique } from '../technique.ts';

/** Nom du motif selon sa taille, pour les explications. */
const NOMS_NUS = ['', '', 'une paire nue', 'un triplet nu', 'un quadruplet nu'];
const NOMS_CACHES = ['', '', 'une paire cachée', 'un triplet caché', 'un quadruplet caché'];

export function chercherSousEnsembleNu(
  infos: InfosTechnique,
  ctx: Contexte,
  etat: EtatLogique,
  taille: number,
): Etape | null {
  for (const r of ctx.regionsDistinctes) {
    const vides = casesVides(ctx, etat, r);
    if (vides.length <= taille) continue;
    // Une case du motif a entre 2 et « taille » candidats (une case à 1 candidat est un singleton)
    const eligibles = vides.filter((c) => {
      const n = compterBits(etat.candidats[c] ?? 0);
      return n >= 2 && n <= taille;
    });
    for (const groupe of combinaisons(eligibles, taille)) {
      let union = 0;
      for (const c of groupe) union |= etat.candidats[c] ?? 0;
      if (compterBits(union) !== taille) continue;
      const eliminations: EliminationBrute[] = vides
        .filter((c) => !groupe.includes(c))
        .map((cellule) => ({ cellule, masque: union }));
      const etape = construireEtape(infos, ctx, etat, {
        cellules: groupe,
        candidatsMotif: candidatsDe(etat, groupe),
        regions: [r],
        description:
          `Dans ${nomRegion(ctx, r)}, ${nomsCellules(ctx, groupe)} forment ${NOMS_NUS[taille] ?? ''} ` +
          `${ensemble(valeursDuMasque(union))} : ces chiffres ne peuvent aller nulle part ailleurs dans la région.`,
        placements: [],
        eliminations,
      });
      if (etape !== null) return etape;
    }
  }
  return null;
}

export function chercherSousEnsembleCache(
  infos: InfosTechnique,
  ctx: Contexte,
  etat: EtatLogique,
  taille: number,
): Etape | null {
  for (const r of regionsCompletes(ctx, null)) {
    const manquantes = valeursDuMasque((ctx.valeursRegion[r] ?? 0) & ~valeursPlacees(ctx, etat, r));
    if (manquantes.length <= taille) continue;
    const placesDe = new Map<number, Cellule[]>();
    for (const v of manquantes) placesDe.set(v, positions(ctx, etat, r, v));
    // Une valeur du motif a entre 2 et « taille » places (1 place = singleton caché)
    const eligibles = manquantes.filter((v) => {
      const n = placesDe.get(v)?.length ?? 0;
      return n >= 2 && n <= taille;
    });
    for (const groupe of combinaisons(eligibles, taille)) {
      const cases = new Set<Cellule>();
      for (const v of groupe) for (const c of placesDe.get(v) ?? []) cases.add(c);
      if (cases.size !== taille) continue;
      const cellules = [...cases].sort((a, b) => a - b);
      const masque = masqueComplet(groupe);
      const etape = construireEtape(infos, ctx, etat, {
        cellules,
        candidatsMotif: candidatsDe(etat, cellules, masque),
        regions: [r],
        description:
          `Dans ${nomRegion(ctx, r)}, les chiffres ${ensemble(groupe)} ne peuvent aller que dans ` +
          `${nomsCellules(ctx, cellules)} : ${NOMS_CACHES[taille] ?? ''}, ces cases ne gardent que ces chiffres.`,
        placements: [],
        eliminations: cellules.map((cellule) => ({ cellule, masque: ~masque })),
      });
      if (etape !== null) return etape;
    }
  }
  return null;
}
