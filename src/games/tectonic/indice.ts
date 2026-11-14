// INDICES du Tectonic, en deux temps (voir Indice dans src/types/jeu.ts), comme au sudoku. Code pur.
//
// 1. un chiffre faux est signalé en premier (action : l'effacer) ;
// 2. sinon, PREMIÈRE étape du solveur logique (techniques du Tectonic). Le solveur part des chiffres
//    posés et des notes du joueur quand elles sont fiables (une case dont les notes contiennent le bon
//    chiffre garde candidats ∩ notes, sinon ses candidats calculés) : l'étape est toujours juste ;
//    - placement : l'action pose le chiffre ;
//    - éliminations : l'action fixe les notes des cases concernées (candidats moins ceux retirés) ;
// 3. filet de sécurité (solveur bloqué, en théorie impossible sur nos grilles) : le chiffre d'une case.
// Les marques citent les cases du motif et celles des zones ou carrés 2×2 concernés.

import { masqueComplet, valeursDuMasque } from '../../moteur/candidats.ts';
import { cellulesDe } from '../../moteur/logique/contexte.ts';
import { etatInitial as etatLogiqueInitial } from '../../moteur/logique/etat.ts';
import { prochaineEtape } from '../../moteur/logique/solveur.ts';
import type { Indice, MarquesIndice, ValeursReglagesJeu } from '../../types/jeu.ts';
import type { EtatLogique, Etape } from '../../types/logique.ts';
import { estActif } from '../../utils/reglages-jeu.ts';
import { nomCase } from './geometrie.ts';
import { structureDe, type StructureTectonic } from './grille.ts';
import { RETRAIT_AUTO_NOTES } from './meta.ts';
import { nomTechnique, TECHNIQUES_TECTONIC } from './techniques.ts';
import type { ActionTectonic, DonneesTectonic, EtatTectonic } from './types.ts';

/** Cases saisies dont le chiffre n'est pas celui de la solution. */
export function cellulesFausses(etat: EtatTectonic, donnees: DonneesTectonic): number[] {
  return etat.valeurs.flatMap((v, i) => (v !== 0 && v !== donnees.solution[i] ? [i] : []));
}

/** État de départ du solveur : chiffres posés, candidats calculés restreints aux notes fiables. */
export function etatPourIndice(etat: EtatTectonic, donnees: DonneesTectonic): EtatLogique {
  const base = etatLogiqueInitial(structureDe(donnees).contexte, etat.valeurs);
  const candidats = base.candidats.map((masque, cellule) => {
    const notes = etat.notes[cellule] ?? [];
    const bonne = donnees.solution[cellule] ?? 0;
    return masque !== 0 && notes.includes(bonne) ? masque & masqueComplet(notes) : masque;
  });
  return { valeurs: base.valeurs, candidats };
}

/** Cases des régions (zones, carrés) citées par l'étape, sans doublon. */
function zonesDe(structure: StructureTectonic, etape: Etape): number[] {
  return [...new Set(etape.regions.flatMap((r) => [...cellulesDe(structure.contexte, r)]))];
}

const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;

function actionPlacer(reglages: ValeursReglagesJeu, cellule: number, valeur: number): ActionTectonic {
  return { type: estActif(reglages, RETRAIT_AUTO_NOTES) ? 'placer' : 'placer-seul', cellule, valeur };
}

function marquesCase(cellule: number): MarquesIndice {
  return { cellules: [cellule], zones: [], candidats: [], eliminations: [], placements: [] };
}

/** Indice tiré d'une étape du solveur. */
function depuisEtape(
  structure: StructureTectonic,
  etape: Etape,
  depart: EtatLogique,
  reglages: ValeursReglagesJeu,
): Indice<ActionTectonic> {
  const titre = nomTechnique(etape.technique);
  const placement = etape.placements[0];
  if (placement !== undefined) {
    const { cellule, valeur } = placement;
    return {
      titre,
      explication: etape.explication,
      marques: {
        cellules: [...new Set([...etape.cellules, cellule])],
        zones: zonesDe(structure, etape),
        candidats: etape.candidatsMotif,
        eliminations: [],
        placements: [placement],
      },
      libelleAction: `Placer le ${valeur} en ${nomCase(structure.colonnes, cellule)}`,
      action: actionPlacer(reglages, cellule, valeur),
    };
  }
  const changements = etape.eliminations.map(({ cellule, valeurs }) => ({
    cellule,
    notes: valeursDuMasque((depart.candidats[cellule] ?? 0) & ~masqueComplet(valeurs)),
  }));
  const nombre = etape.eliminations.reduce((total, e) => total + e.valeurs.length, 0);
  return {
    titre,
    explication: etape.explication,
    marques: {
      cellules: etape.cellules,
      zones: zonesDe(structure, etape),
      candidats: etape.candidatsMotif,
      eliminations: etape.eliminations,
      placements: [],
    },
    libelleAction: `Retirer ${pluriel(nombre, 'candidat')}`,
    action: { type: 'definir-notes', changements },
  };
}

export function indice(
  etat: EtatTectonic,
  donnees: DonneesTectonic,
  reglages: ValeursReglagesJeu,
): Indice<ActionTectonic> | null {
  const structure = structureDe(donnees);
  const faute = cellulesFausses(etat, donnees)[0];
  if (faute !== undefined) {
    return {
      titre: 'Chiffre faux',
      explication: `Le chiffre de la case ${nomCase(structure.colonnes, faute)} ne correspond pas à la solution.`,
      marques: marquesCase(faute),
      libelleAction: 'Effacer ce chiffre',
      action: { type: 'effacer', cellule: faute },
    };
  }
  const cellule = etat.valeurs.findIndex((v) => v === 0);
  if (cellule < 0) return null; // grille complète et juste

  const depart = etatPourIndice(etat, donnees);
  const etape = prochaineEtape(structure.contexte, depart, TECHNIQUES_TECTONIC);
  if (etape !== null) return depuisEtape(structure, etape, depart, reglages);

  const valeur = donnees.solution[cellule] ?? 0;
  return {
    titre: 'Coup de pouce',
    explication: `Aucune technique connue ne permet d'avancer : la case ${nomCase(structure.colonnes, cellule)} contient un ${valeur}.`,
    marques: { ...marquesCase(cellule), placements: [{ cellule, valeur }] },
    libelleAction: `Placer le ${valeur}`,
    action: actionPlacer(reglages, cellule, valeur),
  };
}
