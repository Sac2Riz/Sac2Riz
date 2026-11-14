// CONSÉQUENCES DIRECTES (Diabolique) : un emplacement n'a plus que 2 nombres possibles. On suppose
// l'un puis l'autre, en n'enchaînant que les déductions simples (longueur unique, un seul nombre
// possible, une seule place). Une possibilité qui mène à une impasse en quelques déductions
// (IMPASSE_ETAPES_MAX) est éliminée ; ce qui est vrai dans les deux cas est retenu. Voir hypotheses.ts.

import type { Probleme } from '../../probleme.ts';
import type { EtatSolveur } from '../etat.ts';
import { chercherHypothese, IMPASSE_ETAPES_MAX, TECHNIQUES_IMPASSE } from '../hypotheses.ts';
import type { EtapeCases, TechniqueCases } from '../technique.ts';

const INFOS = { id: 'consequence', niveau: 'diabolique' } as const;

const OPTIONS = {
  possibilitesMax: 2,
  parNombre: false,
  absurde: true,
  impasseEtapesMax: IMPASSE_ETAPES_MAX,
  techniques: TECHNIQUES_IMPASSE,
};

function chercher(p: Probleme, etat: EtatSolveur): EtapeCases | null {
  return chercherHypothese(INFOS, p, etat, OPTIONS, 'en enchaînant seulement les déductions simples');
}

export const consequence: TechniqueCases = { ...INFOS, nom: 'Conséquences directes', chercher };
