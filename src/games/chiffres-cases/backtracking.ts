// BACKTRACKING des chiffres casés : compte les solutions (arrêt à « limite »), pour vérifier
// l'unicité indépendamment du solveur logique. Remplit d'abord l'emplacement qui a le moins de
// candidats. Code pur (les états sont copiés à chaque placement).

import type { Probleme } from './probleme.ts';
import { contradiction, estResolu, placer, type EtatSolveur } from './solveur/etat.ts';

export type ResultatComptage = {
  /** Nombre de solutions trouvées (au plus « limite »). */
  readonly nombre: number;
  /** Nombre de chaque emplacement dans la première solution trouvée, ou null. */
  readonly solution: readonly number[] | null;
};

export function compterSolutions(p: Probleme, depart: EtatSolveur, limite = 2): ResultatComptage {
  let nombre = 0;
  let solution: readonly number[] | null = null;

  const explorer = (etat: EtatSolveur): void => {
    if (nombre >= limite || contradiction(p, etat)) return;
    if (estResolu(etat)) {
      nombre++;
      solution ??= etat.affectes;
      return;
    }
    let choix = -1;
    let taille = Infinity;
    for (const e of p.grille.emplacements) {
      const n = (etat.candidats[e.id] ?? []).length;
      if ((etat.affectes[e.id] ?? -1) < 0 && n < taille) {
        choix = e.id;
        taille = n;
      }
    }
    for (const n of etat.candidats[choix] ?? []) explorer(placer(p, etat, choix, n));
  };

  explorer(depart);
  return { nombre, solution };
}
