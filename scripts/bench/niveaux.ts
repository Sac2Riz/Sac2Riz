// Bench de la notation et de la génération par niveau (étape 2b) :
//  - répartition des niveaux de grilles minimales générées au hasard ;
//  - génération par niveau : temps, essais, échecs, chiffres donnés ;
//  - mesures de la force (score, chiffres donnés) pour calibrer les seuils.

import { performance } from 'node:perf_hooks';
import { genererGrille, type Symetrie } from '../../src/moteur/generateur.ts';
import { CIBLES_ARRET_TOT, genererParNiveau, type PlageIndices } from '../../src/moteur/generation-niveau.ts';
import { creerContexte, type Contexte } from '../../src/moteur/logique/contexte.ts';
import { resoudreLogique } from '../../src/moteur/logique/solveur.ts';
import { mesurerNotation, noterGrille, SEUILS_FORCE, type MesuresNotation } from '../../src/moteur/notation.ts';
import type { DefinitionGrille } from '../../src/types/grille.ts';
import { INFOS_NIVEAUX, NIVEAUX, type Force, type Niveau } from '../../src/types/niveaux.ts';
import { creerAlea } from '../../src/utils/alea.ts';
import { pourcent, stats, tableau, type Stats } from './outils.ts';

const f1 = (x: number): string => x.toFixed(1);
const f0 = (x: number): string => x.toFixed(0);

/** Répartition des niveaux de grilles minimales (retrait sans fonction d'acceptation). */
export function benchRepartition(definition: DefinitionGrille, nombre: number): void {
  const ctx = creerContexte(definition);
  console.log(`## 2. Répartition des niveaux — ${nombre} grilles minimales au hasard (graines 1 à ${nombre})\n`);
  const lignes: string[][] = [];
  for (const symetrie of ['centrale', 'aucune'] as const) {
    const compte = new Map<Niveau | 'bloquee', number>();
    for (let graine = 1; graine <= nombre; graine++) {
      const { enonce } = genererGrille(definition, creerAlea(graine), { symetrie });
      const cle = noterGrille(ctx, enonce)?.niveau ?? 'bloquee';
      compte.set(cle, (compte.get(cle) ?? 0) + 1);
    }
    lignes.push([
      `symétrie ${symetrie}`,
      ...NIVEAUX.map((n) => pourcent(compte.get(n) ?? 0, nombre)),
      pourcent(compte.get('bloquee') ?? 0, nombre),
    ]);
  }
  tableau(['', ...NIVEAUX.map((n) => INFOS_NIVEAUX[n].nom), 'Bloquée'], lignes);
}

/** Une configuration de génération à mesurer. */
type Config = {
  readonly nom: string;
  readonly niveau: Niveau;
  readonly symetrie: Symetrie;
  readonly cibleIndices: PlageIndices | null;
};

type Grille = { readonly temps: number; readonly essais: number; readonly mesures: MesuresNotation; readonly force: Force };

type Bilan = { readonly config: Config; readonly grilles: readonly Grille[]; readonly echecs: number; readonly tempsEchecs: number[] };

const TENTATIVES_MAX = 200;

function mesurerConfig(definition: DefinitionGrille, ctx: Contexte, config: Config, nombre: number): Bilan {
  const grilles: Grille[] = [];
  const tempsEchecs: number[] = [];
  let echecs = 0;
  for (let graine = 1; graine <= nombre; graine++) {
    const t0 = performance.now();
    const r = genererParNiveau(definition, config.niveau, creerAlea(graine), {
      tentativesMax: TENTATIVES_MAX,
      symetrie: config.symetrie,
      cibleIndices: config.cibleIndices,
    });
    const temps = performance.now() - t0;
    if (!r.ok) {
      echecs++;
      tempsEchecs.push(temps);
      continue;
    }
    const { etapes } = resoudreLogique(ctx, r.enonce);
    grilles.push({ temps, essais: r.essais, mesures: mesurerNotation(r.enonce, etapes, config.niveau), force: r.notation.force });
  }
  return { config, grilles, echecs, tempsEchecs };
}

/** Configurations mesurées : chaque niveau, plus les variantes utiles à la décision. */
function configurations(): Config[] {
  const configs: Config[] = [];
  for (const niveau of NIVEAUX) {
    const nom = INFOS_NIVEAUX[niveau].nom;
    configs.push({ nom, niveau, symetrie: 'centrale', cibleIndices: CIBLES_ARRET_TOT[niveau] });
    if (CIBLES_ARRET_TOT[niveau] !== null) {
      configs.push({ nom: `${nom} (sans arrêt tôt)`, niveau, symetrie: 'centrale', cibleIndices: null });
    }
    if (niveau === 'expert' || niveau === 'diabolique') {
      configs.push({ nom: `${nom} (sans symétrie)`, niveau, symetrie: 'aucune', cibleIndices: null });
    }
  }
  return configs;
}

const quartiles = (s: Stats, f: (x: number) => string): string => `${f(s.min)} / ${f(s.q1)} / ${f(s.mediane)} / ${f(s.q3)} / ${f(s.max)}`;

export function benchNiveaux(definition: DefinitionGrille, nombre: number): void {
  const ctx = creerContexte(definition);
  // Échauffement
  genererParNiveau(definition, 'difficile', creerAlea(999_999), { tentativesMax: 20 });
  const bilans = configurations().map((c) => mesurerConfig(definition, ctx, c, nombre));

  console.log(`## 3. Génération par niveau — ${nombre} grilles par configuration, au plus ${TENTATIVES_MAX} essais\n`);
  tableau(
    ['', 'arrêt tôt', 'échecs', 'essais moy', 'essais max', 'temps moy', 'temps max', 'chiffres moy', 'min-max'],
    bilans.map(({ config, grilles, echecs }) => {
      const temps = stats(grilles.map((g) => g.temps));
      const essais = stats(grilles.map((g) => g.essais));
      const indices = stats(grilles.map((g) => g.mesures.indices));
      return [
        config.nom,
        config.cibleIndices === null ? '—' : `${config.cibleIndices.min}-${config.cibleIndices.max}`,
        pourcent(echecs, nombre),
        f1(essais.moyenne),
        f0(essais.max),
        `${f0(temps.moyenne)} ms`,
        `${f0(temps.max)} ms`,
        f1(indices.moyenne),
        `${indices.min}-${indices.max}`,
      ];
    }),
  );

  console.log('## 4. Mesures de la force (min / q1 / médiane / q3 / max)\n');
  console.log('score = étapes du niveau max + ½ × étapes du niveau juste en dessous (compté seulement s\'il est au moins Moyen)\n');
  const seuilsDe = (n: Niveau): string => {
    if (n === 'expert' || n === 'diabolique') return '—';
    const s = SEUILS_FORCE[n];
    return s.score === null ? `≤ ${s.indices} chiffres` : `score ≥ ${s.score} ou ≤ ${s.indices} chiffres`;
  };
  tableau(
    ['', 'score', 'chiffres donnés', 'seuils', 'force haute', 'par score', 'par chiffres'],
    bilans.map(({ config, grilles }) => {
      const n = config.niveau;
      const haute = grilles.filter((g) => g.force === INFOS_NIVEAUX[n].forceMax && INFOS_NIVEAUX[n].forceMin !== g.force).length;
      const s = n === 'expert' || n === 'diabolique' ? null : SEUILS_FORCE[n];
      const seuilScore = s === null ? null : s.score;
      const parScore = seuilScore === null ? '—' : pourcent(grilles.filter((g) => g.mesures.score >= seuilScore).length, grilles.length);
      const parIndices = s === null ? '—' : pourcent(grilles.filter((g) => g.mesures.indices <= s.indices).length, grilles.length);
      return [
        config.nom,
        quartiles(stats(grilles.map((g) => g.mesures.score)), f1),
        quartiles(stats(grilles.map((g) => g.mesures.indices)), f0),
        seuilsDe(n),
        s === null ? '—' : pourcent(haute, grilles.length),
        parScore,
        parIndices,
      ];
    }),
  );
}
