// INDICES des chiffres casés, en deux temps (voir Indice dans src/types/jeu.ts). Code pur.
//
// Le joueur ne prend pas de notes : un indice aboutit donc toujours à un PLACEMENT.
// 1. Un nombre faux est signalé en premier (action : effacer son emplacement).
// 2. Sinon, le solveur logique part des nombres posés (tous justes à ce stade) et des emplacements
//    entièrement écrits par les croisements, et avance jusqu'à sa première étape qui place un
//    nombre. Le titre est la technique la plus dure utilisée en chemin ; l'explication reprend les
//    éliminations qui y mènent puis le placement. Marques : les cases de l'emplacement (avec ses
//    chiffres) et, en fond, celles des emplacements qui justifient la déduction.
// 3. Filet de sécurité (solveur bloqué, en théorie impossible sur nos grilles) : le bon nombre
//    d'un emplacement vide.

import type { Indice, MarquesIndice } from '../../types/jeu.ts';
import { nomEmplacement } from './grille.ts';
import { structureDe, type Structure } from './probleme.ts';
import { chiffresDesCases, emplacementsFaux } from './regles.ts';
import { etatDepart, type EtatSolveur, type PlacementSolveur } from './solveur/etat.ts';
import { appliquerEtape } from './solveur/hypotheses.ts';
import { prochaineEtape } from './solveur/solveur.ts';
import { IDS_TECHNIQUES_CASES, type EtapeCases } from './solveur/technique.ts';
import { TECHNIQUES_CASES } from './solveur/techniques/index.ts';
import type { ActionCases, DonneesCases, EtatCases } from './types.ts';

const NOMS_TECHNIQUES: ReadonlyMap<string, string> = new Map(TECHNIQUES_CASES.map((t) => [t.id, t.nom]));

export function nomTechnique(id: string): string {
  return NOMS_TECHNIQUES.get(id) ?? (id === 'aucune' ? 'Aucune' : id);
}

/** Nombre maximal d'étapes d'élimination citées en entier dans une explication. */
const ELIMINATIONS_CITEES = 3;

/** Emplacements remplis du point de vue du solveur : posés, ou entièrement écrits par les croisements. */
function placementsConnus(etat: EtatCases, donnees: DonneesCases, s: Structure): PlacementSolveur[] {
  const chiffres = chiffresDesCases(etat, donnees);
  return s.probleme.grille.emplacements.flatMap((e) => {
    const plein = (etat.places[e.id] ?? null) !== null || e.cellules.every((c) => chiffres[c] !== null);
    return plein ? [{ emplacement: e.id, nombre: s.solution[e.id] ?? -1 }] : [];
  });
}

function marquesDe(s: Structure, emplacement: number, motif: readonly number[]): MarquesIndice {
  const { grille } = s.probleme;
  const cellules = grille.emplacements[emplacement]?.cellules ?? [];
  const texte = s.solutionTexte[emplacement] ?? '';
  const zones = [...new Set(motif.filter((id) => id !== emplacement).flatMap((id) => grille.emplacements[id]?.cellules ?? []))].filter(
    (c) => !cellules.includes(c),
  );
  return {
    cellules,
    zones,
    candidats: [],
    eliminations: [],
    placements: cellules.map((cellule, i) => ({ cellule, valeur: Number(texte[i]) })),
  };
}

function explicationDe(chemin: readonly EtapeCases[]): string {
  const final = chemin[chemin.length - 1];
  const avant = chemin.slice(0, -1);
  if (final === undefined) return '';
  if (avant.length === 0) return final.explication;
  const cites =
    avant.length <= ELIMINATIONS_CITEES
      ? avant.map((e) => e.explication)
      : [
          ...avant.slice(0, ELIMINATIONS_CITEES - 1).map((e) => e.explication),
          `(… ${avant.length - ELIMINATIONS_CITEES} autres éliminations du même genre …)`,
          avant[avant.length - 1]?.explication ?? '',
        ];
  return `${cites.join(' ')} Alors : ${final.explication}`;
}

/** Technique la plus dure du chemin (ordre d'IDS_TECHNIQUES_CASES). */
function techniqueMax(chemin: readonly EtapeCases[]): string {
  let rang = 0;
  for (const e of chemin) rang = Math.max(rang, IDS_TECHNIQUES_CASES.indexOf(e.technique));
  return IDS_TECHNIQUES_CASES[rang] ?? 'longueur-unique';
}

/** Étapes du solveur jusqu'au premier placement (null si le solveur bloque avant). */
function cheminVersPlacement(s: Structure, depart: EtatSolveur): EtapeCases[] | null {
  const chemin: EtapeCases[] = [];
  let etat = depart;
  for (let garde = 0; garde < 500; garde++) {
    const etape = prochaineEtape(s.probleme, etat);
    if (etape === null) return null;
    chemin.push(etape);
    if (etape.placements.length > 0) return chemin;
    etat = appliquerEtape(s.probleme, etat, etape);
  }
  return null;
}

export function indiceCases(etat: EtatCases, donnees: DonneesCases): Indice<ActionCases> | null {
  const s = structureDe(donnees);
  const { grille } = s.probleme;

  const faux = emplacementsFaux(etat, donnees)[0];
  if (faux !== undefined) {
    return {
      titre: 'Nombre faux',
      explication: `Le nombre ${etat.places[faux] ?? ''} ne va pas dans ${nomEmplacement(grille, faux)}.`,
      marques: { ...marquesDe(s, faux, []), placements: [] },
      libelleAction: 'Effacer ce nombre',
      action: { type: 'effacer', emplacement: faux },
    };
  }

  const connus = placementsConnus(etat, donnees, s);
  const remplis = new Set(connus.map((c) => c.emplacement));
  const vide = grille.emplacements.find((e) => !remplis.has(e.id));
  if (vide === undefined) return null; // grille complète et juste

  const chemin = cheminVersPlacement(s, etatDepart(s.probleme, connus));
  const placement = chemin?.[chemin.length - 1]?.placements[0];
  if (chemin !== null && placement !== undefined) {
    const nombre = s.probleme.nombres[placement.nombre] ?? '';
    return {
      titre: nomTechnique(techniqueMax(chemin)),
      explication: explicationDe(chemin),
      marques: marquesDe(s, placement.emplacement, chemin.flatMap((e) => e.motif)),
      libelleAction: `Placer ${nombre}`,
      action: { type: 'placer', emplacement: placement.emplacement, nombre },
    };
  }

  const nombre = s.solutionTexte[vide.id] ?? '';
  return {
    titre: 'Coup de pouce',
    explication: `Aucune technique connue ne permet d'avancer : ${nomEmplacement(grille, vide.id)} contient ${nombre}.`,
    marques: marquesDe(s, vide.id, []),
    libelleAction: `Placer ${nombre}`,
    action: { type: 'placer', emplacement: vide.id, nombre },
  };
}
