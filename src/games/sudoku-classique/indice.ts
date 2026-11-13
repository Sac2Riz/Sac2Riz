// INDICES du sudoku classique, en deux temps (voir Indice dans src/types/jeu.ts) :
// d'abord les marques (cases, candidats du motif, éliminations) avec l'explication, puis
// l'action qui applique l'indice. Code pur.
//
// Ordre de recherche :
// 1. un chiffre faux est signalé en premier (action : l'effacer) ;
// 2. sinon, PREMIÈRE étape du solveur logique (la technique la plus simple qui progresse).
//    Le solveur part des chiffres posés et des notes du joueur quand elles sont fiables : une
//    case dont les notes contiennent le bon chiffre garde ses notes (candidats calculés ∩ notes),
//    sinon elle prend ses candidats calculés. La solution reste donc toujours parmi les
//    candidats : l'étape trouvée est juste, et une élimination déjà faite n'est pas reproposée ;
//    - étape avec placement : l'action pose le chiffre ;
//    - étape d'éliminations : l'action fixe les notes des cases concernées (leurs candidats
//      moins ceux éliminés), même si le joueur ne les avait pas encore notées ;
// 3. filet de sécurité (solveur bloqué, en théorie impossible sur nos grilles) : le chiffre d'une case.

import { masqueComplet, valeursDuMasque } from '../../moteur/candidats.ts';
import { cellulesDe } from '../../moteur/logique/contexte.ts';
import { etatInitial as etatLogiqueInitial } from '../../moteur/logique/etat.ts';
import { prochaineEtape } from '../../moteur/logique/solveur.ts';
import { TECHNIQUES } from '../../moteur/logique/techniques/index.ts';
import type { Indice, OptionsJeu } from '../../types/jeu.ts';
import type { EtatLogique, Etape } from '../../types/logique.ts';
import { CONTEXTE } from './definition.ts';
import { nomCase } from './geometrie.ts';
import type { ActionSudoku, DonneesSudoku, EtatSudoku } from './types.ts';

/** Nom affiché de chaque technique, d'après son identifiant. */
const NOMS_TECHNIQUES: ReadonlyMap<string, string> = new Map(TECHNIQUES.map((t) => [t.id, t.nom]));

export function nomTechnique(id: string): string {
  return NOMS_TECHNIQUES.get(id) ?? id;
}

/** Cases saisies dont le chiffre n'est pas celui de la solution. */
export function cellulesFausses(etat: EtatSudoku, donnees: DonneesSudoku): number[] {
  return etat.valeurs.flatMap((v, i) => (v !== 0 && v !== donnees.solution[i] ? [i] : []));
}

/** État de départ du solveur : chiffres posés, candidats calculés restreints aux notes fiables. */
export function etatPourIndice(etat: EtatSudoku, donnees: DonneesSudoku): EtatLogique {
  const base = etatLogiqueInitial(CONTEXTE, etat.valeurs);
  const candidats = base.candidats.map((masque, cellule) => {
    const notes = etat.notes[cellule] ?? [];
    const bonne = donnees.solution[cellule] ?? 0;
    return masque !== 0 && notes.includes(bonne) ? masque & masqueComplet(notes) : masque;
  });
  return { valeurs: base.valeurs, candidats };
}

/** Cases des régions citées par l'étape (sans doublon). */
function zonesDe(etape: Etape): number[] {
  return [...new Set(etape.regions.flatMap((r) => [...cellulesDe(CONTEXTE, r)]))];
}

const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;

function actionPlacer(options: OptionsJeu, cellule: number, valeur: number): ActionSudoku {
  return { type: options.retraitAutoNotes ? 'placer' : 'placer-seul', cellule, valeur };
}

/** Indice tiré d'une étape du solveur. */
function depuisEtape(etape: Etape, depart: EtatLogique, options: OptionsJeu): Indice<ActionSudoku> {
  const titre = nomTechnique(etape.technique);
  const placement = etape.placements[0];
  if (placement !== undefined) {
    const { cellule, valeur } = placement;
    return {
      titre,
      explication: etape.explication,
      marques: {
        cellules: [...new Set([...etape.cellules, cellule])],
        zones: zonesDe(etape),
        candidats: etape.candidatsMotif,
        eliminations: [],
        placements: [placement],
      },
      libelleAction: `Placer le ${valeur} en ${nomCase(cellule)}`,
      action: actionPlacer(options, cellule, valeur),
    };
  }
  // Éliminations : chaque case concernée garde ses candidats moins ceux retirés
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
      zones: zonesDe(etape),
      candidats: etape.candidatsMotif,
      eliminations: etape.eliminations,
      placements: [],
    },
    libelleAction: `Retirer ${pluriel(nombre, 'candidat')}`,
    action: { type: 'definir-notes', changements },
  };
}

function marquesCase(cellule: number): Indice<ActionSudoku>['marques'] {
  return { cellules: [cellule], zones: [], candidats: [], eliminations: [], placements: [] };
}

export function indice(etat: EtatSudoku, donnees: DonneesSudoku, options: OptionsJeu): Indice<ActionSudoku> | null {
  const faute = cellulesFausses(etat, donnees)[0];
  if (faute !== undefined) {
    return {
      titre: 'Chiffre faux',
      explication: `Le chiffre de la case ${nomCase(faute)} ne correspond pas à la solution.`,
      marques: marquesCase(faute),
      libelleAction: 'Effacer ce chiffre',
      action: { type: 'effacer', cellule: faute },
    };
  }
  const cellule = etat.valeurs.findIndex((v) => v === 0);
  if (cellule < 0) return null; // grille complète et juste

  const depart = etatPourIndice(etat, donnees);
  const etape = prochaineEtape(CONTEXTE, depart);
  if (etape !== null) return depuisEtape(etape, depart, options);

  const valeur = donnees.solution[cellule] ?? 0;
  return {
    titre: 'Coup de pouce',
    explication: `Aucune technique connue ne permet d'avancer : la case ${nomCase(cellule)} contient un ${valeur}.`,
    marques: { ...marquesCase(cellule), placements: [{ cellule, valeur }] },
    libelleAction: `Placer le ${valeur}`,
    action: actionPlacer(options, cellule, valeur),
  };
}
