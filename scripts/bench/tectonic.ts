// Bench du Tectonic (étape 7a) : « npm run bench -- --jeu=tectonic ».
// Options : --n=<nombre> grilles par niveau (défaut 100), --rapide (n = 20), --niveau=<id> (un seul niveau),
// --zones-max=<5|6> (taille maximale des zones, pour comparer), --cote=<côté> (autre taille de grille).
// Pour chaque niveau : temps, essais, constructions ratées, tailles de zones, chiffres donnés, score,
// part de force haute (calibrage des seuils), techniques utilisées ; puis la répartition des niveaux de
// grilles minimales.

import { performance } from 'node:perf_hooks';
import { retirerChiffres } from '../../src/moteur/generateur.ts';
import { mesurerNotation } from '../../src/moteur/notation.ts';
import { construireGrille } from '../../src/games/tectonic/construction.ts';
import {
  genererTectonic,
  PARAMETRES_NIVEAUX,
  parametresGrille,
  type ParametresNiveau,
} from '../../src/games/tectonic/generateur.ts';
import { cellulesDesZones } from '../../src/games/tectonic/geometrie.ts';
import { structureTectonic } from '../../src/games/tectonic/grille.ts';
import { noterTectonic, resoudreTectonic } from '../../src/games/tectonic/notation.ts';
import { INFOS_NIVEAUX, type Niveau } from '../../src/types/niveaux.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { argumentNombre, pourcent, stats, tableau } from './outils.ts';

const TENTATIVES_MAX = 1000;
const f1 = (x: number): string => x.toFixed(1);
const f0 = (x: number): string => x.toFixed(0);

type Grille = {
  readonly temps: number;
  readonly essais: number;
  readonly ratees: number;
  readonly tailles: readonly number[];
  readonly indices: number;
  readonly score: number;
  readonly haute: boolean;
  readonly techniques: readonly string[];
};

type Bilan = {
  readonly niveau: Niveau;
  readonly parametres: ParametresNiveau;
  readonly grilles: readonly Grille[];
  readonly echecs: number;
};

/** Réglages du niveau, avec les éventuelles options --zones-max et --cote. */
function parametresDe(niveau: Niveau): ParametresNiveau {
  const base = PARAMETRES_NIVEAUX[niveau];
  const zonesMax = argumentNombre('zones-max', base.tailleMax);
  const cote = argumentNombre('cote', base.lignes);
  if (zonesMax === base.tailleMax && cote === base.lignes) return base;
  return { ...parametresGrille(cote, zonesMax, base.cibleIndices), unitairesMax: base.unitairesMax };
}

function mesurerNiveau(niveau: Niveau, nombre: number): Bilan {
  const parametres = parametresDe(niveau);
  const grilles: Grille[] = [];
  let echecs = 0;
  for (let graine = 1; graine <= nombre; graine++) {
    const t0 = performance.now();
    const r = genererTectonic(niveau, creerAlea(graine), { tentativesMax: TENTATIVES_MAX, parametres });
    const temps = performance.now() - t0;
    if (!r.ok) {
      echecs++;
      continue;
    }
    const { lignes, colonnes, zones, enonce } = r.donnees;
    const resultat = resoudreTectonic(structureTectonic(lignes, colonnes, zones).contexte, enonce);
    const infos = INFOS_NIVEAUX[niveau];
    grilles.push({
      temps,
      essais: r.essais,
      ratees: r.constructionsRatees,
      tailles: cellulesDesZones(zones).map((z) => z.length),
      indices: enonce.filter((v) => v !== 0).length,
      score: mesurerNotation(enonce, resultat.etapes, niveau).score,
      haute: infos.forceMin !== infos.forceMax && r.notation.force === infos.forceMax,
      techniques: Object.keys(r.notation.details),
    });
  }
  return { niveau, parametres, grilles, echecs };
}

const plage = (valeurs: readonly number[]): string => {
  const s = stats(valeurs);
  return `${f1(s.moyenne)} (${f0(s.min)}-${f0(s.max)})`;
};

/** Niveaux longs à générer : échantillon réduit (au moins 5 grilles). */
const PART_ECHANTILLON: Readonly<Partial<Record<Niveau, number>>> = { expert: 0.3, diabolique: 0.3 };

function afficherGeneration(bilans: readonly Bilan[]): void {
  console.log('### Génération\n');
  tableau(
    ['Niveau', 'Grille', 'Zones max', 'Échecs', 'Essais moy / max', 'Constructions ratées moy', 'Temps moy / méd / max (ms)'],
    bilans.map(({ niveau, parametres: p, grilles, echecs }) => {
      const essais = stats(grilles.map((g) => g.essais));
      const temps = stats(grilles.map((g) => g.temps));
      return [
        INFOS_NIVEAUX[niveau].nom,
        `${p.lignes}×${p.colonnes}`,
        `${p.tailleMax}`,
        `${echecs}`,
        `${f1(essais.moyenne)} / ${f0(essais.max)}`,
        f1(stats(grilles.map((g) => g.ratees)).moyenne),
        `${f0(temps.moyenne)} / ${f0(temps.mediane)} / ${f0(temps.max)}`,
      ];
    }),
  );
}

function afficherContenu(bilans: readonly Bilan[]): void {
  console.log('### Contenu des grilles\n');
  const tailleMax = Math.max(...bilans.map((b) => b.parametres.tailleMax));
  tableau(
    ['Niveau', 'Zones moy (min-max)', ...Array.from({ length: tailleMax }, (_, i) => `${i + 1} case${i > 0 ? 's' : ''}`), 'Zones d\'une case moy', 'Chiffres donnés moy (min-max)', 'Part des cases'],
    bilans.map(({ niveau, parametres: p, grilles }) => {
      const toutes = grilles.flatMap((g) => g.tailles);
      return [
        INFOS_NIVEAUX[niveau].nom,
        plage(grilles.map((g) => g.tailles.length)),
        ...Array.from({ length: tailleMax }, (_, i) => pourcent(toutes.filter((t) => t === i + 1).length, toutes.length)),
        f1(stats(grilles.map((g) => g.tailles.filter((t) => t === 1).length)).moyenne),
        plage(grilles.map((g) => g.indices)),
        `${f0((100 * stats(grilles.map((g) => g.indices)).moyenne) / (p.lignes * p.colonnes))} %`,
      ];
    }),
  );
}

function afficherNotation(bilans: readonly Bilan[]): void {
  console.log('### Notation : score et chiffres donnés (quartiles), part de force haute avec les seuils actuels\n');
  tableau(
    ['Niveau', 'Score min / q1 / méd / q3 / max', 'Donnés min / q1 / méd / q3 / max', 'Force haute'],
    bilans.map(({ niveau, grilles }) => {
      const s = stats(grilles.map((g) => g.score));
      const d = stats(grilles.map((g) => g.indices));
      return [
        INFOS_NIVEAUX[niveau].nom,
        `${f1(s.min)} / ${f1(s.q1)} / ${f1(s.mediane)} / ${f1(s.q3)} / ${f1(s.max)}`,
        `${f0(d.min)} / ${f0(d.q1)} / ${f0(d.mediane)} / ${f0(d.q3)} / ${f0(d.max)}`,
        pourcent(grilles.filter((g) => g.haute).length, grilles.length),
      ];
    }),
  );

  console.log('### Techniques utilisées (part des grilles)\n');
  const ids = [...new Set(bilans.flatMap((b) => b.grilles.flatMap((g) => g.techniques)))];
  tableau(
    ['Niveau', ...ids],
    bilans.map(({ niveau, grilles }) => [
      INFOS_NIVEAUX[niveau].nom,
      ...ids.map((id) => pourcent(grilles.filter((g) => g.techniques.includes(id)).length, grilles.length)),
    ]),
  );
}

/** Répartition des niveaux de grilles minimales (retrait sans fonction d'acceptation), par côté. */
function afficherRepartition(nombre: number, cotes: readonly number[], zonesMax: number): void {
  console.log(`### Répartition des niveaux de grilles minimales (${nombre} grilles par côté, zones ≤ ${zonesMax})\n`);
  const lignes = cotes.map((cote) => {
    const p = parametresGrille(cote, zonesMax, null);
    const alea = creerAlea(1);
    const compte = new Map<string, number>();
    for (let i = 0; i < nombre; ) {
      const pleine = construireGrille(p, alea);
      if (pleine === null) continue;
      i++;
      const structure = structureTectonic(cote, cote, pleine.zones);
      const enonce = retirerChiffres(structure.definition, pleine.solution, alea, { symetrie: 'aucune' });
      const notation = noterTectonic(structure.contexte, enonce);
      const cle = notation === null ? 'essai-erreur' : notation.niveau;
      compte.set(cle, (compte.get(cle) ?? 0) + 1);
    }
    return [`${cote}×${cote}`, ...[...Object.keys(INFOS_NIVEAUX), 'essai-erreur'].map((n) => pourcent(compte.get(n) ?? 0, nombre))];
  });
  tableau(['Grille', ...Object.values(INFOS_NIVEAUX).map((i) => i.nom), 'Essai-erreur'], lignes);
}

export function benchTectonic(nombre: number, niveaux: readonly Niveau[]): void {
  console.log(`## Tectonic — génération par niveau (${nombre} grilles par niveau, Expert et Diabolique ${Math.max(5, Math.round(nombre * 0.3))} ; graines 1, 2, 3… ; au plus ${TENTATIVES_MAX} essais)\n`);
  const bilans: Bilan[] = [];
  for (const niveau of niveaux) {
    const t0 = performance.now();
    bilans.push(mesurerNiveau(niveau, Math.max(5, Math.round(nombre * (PART_ECHANTILLON[niveau] ?? 1)))));
    console.log(`  ${INFOS_NIVEAUX[niveau].nom} mesuré en ${f1((performance.now() - t0) / 1000)} s`);
  }
  console.log('');
  afficherGeneration(bilans);
  afficherContenu(bilans);
  afficherNotation(bilans);
  if (niveaux.length > 1) afficherRepartition(Math.min(nombre, 100), [6, 7, 8, 9, 10], argumentNombre('zones-max', 5));
}
