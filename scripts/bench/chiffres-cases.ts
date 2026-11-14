// Bench des chiffres casés (étape 4a) : « npm run bench -- --jeu=chiffres-cases ».
// Options : --n=<nombre> grilles par niveau (défaut 100), --rapide (n = 20), --niveau=<id> (un seul niveau).
// Pour chaque niveau : temps, essais, échecs, taille de grille, nombres, groupes de même longueur,
// pré-placés, score et part de force haute (calibrage des seuils de notation).

import { performance } from 'node:perf_hooks';
import { genererCases, PARAMETRES_NIVEAUX } from '../../src/games/chiffres-cases/generateur.ts';
import { mesurer, type MesuresCases } from '../../src/games/chiffres-cases/notation.ts';
import { structureDe } from '../../src/games/chiffres-cases/probleme.ts';
import { etatDepart } from '../../src/games/chiffres-cases/solveur/etat.ts';
import { resoudre } from '../../src/games/chiffres-cases/solveur/solveur.ts';
import { INFOS_NIVEAUX, NIVEAUX, estNiveau, type Niveau } from '../../src/types/niveaux.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { pourcent, stats, tableau } from './outils.ts';

const TENTATIVES_MAX = 1000;

const f1 = (x: number): string => x.toFixed(1);
const f0 = (x: number): string => x.toFixed(0);

type Grille = {
  readonly temps: number;
  readonly essais: number;
  readonly nombres: number;
  readonly mesures: MesuresCases;
  readonly haute: boolean;
  readonly techniques: readonly string[];
  readonly nonCroisees: number;
};

type Bilan = { readonly niveau: Niveau; readonly grilles: readonly Grille[]; readonly echecs: number; readonly tempsEchecs: readonly number[] };

function mesurerNiveau(niveau: Niveau, nombre: number): Bilan {
  const grilles: Grille[] = [];
  const tempsEchecs: number[] = [];
  let echecs = 0;
  for (let graine = 1; graine <= nombre; graine++) {
    const t0 = performance.now();
    const r = genererCases(niveau, creerAlea(graine), { tentativesMax: TENTATIVES_MAX });
    const temps = performance.now() - t0;
    if (!r.ok) {
      echecs++;
      tempsEchecs.push(temps);
      continue;
    }
    const { probleme: p, solution } = structureDe(r.donnees);
    const donnes = r.donnees.preplaces.map((emplacement) => ({ emplacement, nombre: solution[emplacement] ?? 0 }));
    const etapes = resoudre(p, etatDepart(p, donnes)).etapes;
    const blanches = p.grille.noires.filter((n) => !n).length;
    grilles.push({
      temps,
      essais: r.essais,
      nombres: p.nombres.length,
      mesures: mesurer(p, etapes, niveau, donnes.length),
      haute: r.notation.force === INFOS_NIVEAUX[niveau].forceMax && INFOS_NIVEAUX[niveau].forceMin !== INFOS_NIVEAUX[niveau].forceMax,
      techniques: Object.keys(r.notation.details),
      nonCroisees: p.grille.parCase.filter((e) => e.length === 1).length / blanches,
    });
  }
  return { niveau, grilles, echecs, tempsEchecs };
}

const plage = (valeurs: readonly number[], format: (x: number) => string = f1): string => {
  const s = stats(valeurs);
  return `${format(s.moyenne)} (${f0(s.min)}-${f0(s.max)})`;
};

/** Expert et Diabolique sont bien plus longs à générer : échantillon réduit (au moins 5 grilles). */
const PART_ECHANTILLON: Readonly<Partial<Record<Niveau, number>>> = { expert: 0.3, diabolique: 0.2 };

export function benchChiffresCases(nombre: number, niveaux: readonly Niveau[]): void {
  console.log(
    `## Chiffres casés — génération par niveau (${nombre} grilles par niveau, Expert ${Math.round(nombre * 0.3)}, ` +
      `Diabolique ${Math.round(nombre * 0.2)} ; graines 1, 2, 3… ; au plus ${TENTATIVES_MAX} essais)\n`,
  );
  const bilans: Bilan[] = [];
  for (const niveau of niveaux) {
    const t0 = performance.now();
    bilans.push(mesurerNiveau(niveau, Math.max(5, Math.round(nombre * (PART_ECHANTILLON[niveau] ?? 1)))));
    console.log(`  ${INFOS_NIVEAUX[niveau].nom} mesuré en ${f1((performance.now() - t0) / 1000)} s`);
  }
  console.log('');

  console.log('### Génération\n');
  tableau(
    ['Niveau', 'Grille', 'Échecs', 'Essais moy / max', 'Temps moy / méd / max (ms)'],
    bilans.map(({ niveau, grilles, echecs }) => {
      const p = PARAMETRES_NIVEAUX[niveau];
      const essais = stats(grilles.map((g) => g.essais));
      const temps = stats(grilles.map((g) => g.temps));
      return [
        INFOS_NIVEAUX[niveau].nom,
        `${p.largeur}×${p.hauteur}`,
        `${echecs}`,
        `${f1(essais.moyenne)} / ${f0(essais.max)}`,
        `${f0(temps.moyenne)} / ${f0(temps.mediane)} / ${f0(temps.max)}`,
      ];
    }),
  );

  console.log('### Contenu des grilles (moyenne, min-max)\n');
  tableau(
    ['Niveau', 'Nombres', 'Plus grand groupe', 'Pré-placés', 'Cases non croisées'],
    bilans.map(({ niveau, grilles }) => [
      INFOS_NIVEAUX[niveau].nom,
      plage(grilles.map((g) => g.nombres)),
      plage(grilles.map((g) => g.mesures.groupe)),
      plage(grilles.map((g) => g.mesures.preplaces)),
      `${f0(100 * stats(grilles.map((g) => g.nonCroisees)).moyenne)} %`,
    ]),
  );

  console.log('### Notation : score (quartiles) et part de force haute avec les seuils actuels\n');
  tableau(
    ['Niveau', 'Score min / q1 / méd / q3 / max', 'Groupe q1 / méd / q3', 'Force haute'],
    bilans.map(({ niveau, grilles }) => {
      const s = stats(grilles.map((g) => g.mesures.score));
      const gr = stats(grilles.map((g) => g.mesures.groupe));
      return [
        INFOS_NIVEAUX[niveau].nom,
        `${f1(s.min)} / ${f1(s.q1)} / ${f1(s.mediane)} / ${f1(s.q3)} / ${f1(s.max)}`,
        `${f0(gr.q1)} / ${f0(gr.mediane)} / ${f0(gr.q3)}`,
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

/** Niveaux demandés (--niveau=<id>), tous par défaut. */
export function niveauxDemandes(): readonly Niveau[] {
  const arg = process.argv.find((a) => a.startsWith('--niveau='))?.slice('--niveau='.length);
  return arg !== undefined && estNiveau(arg) ? [arg] : NIVEAUX;
}
