// HYPOTHÈSES (Diabolique) : un emplacement n'a plus que 2 ou 3 nombres possibles, ou un nombre
// n'a plus que 2 ou 3 emplacements possibles. On examine chaque possibilité en enchaînant toutes
// les techniques jusqu'au niveau Expert : ce qui est vrai dans tous les cas est retenu. Une
// possibilité qui mène à une impasse COURTE (quelques déductions simples) est éliminée, comme pour
// les conséquences directes, mais aussi sur les choix à 3 possibilités ou par nombre. Voir hypotheses.ts.

import type { Probleme } from '../../probleme.ts';
import type { EtatSolveur } from '../etat.ts';
import { chercherHypothese, IMPASSE_ETAPES_MAX } from '../hypotheses.ts';
import type { EtapeCases, TechniqueCases } from '../technique.ts';
import { croisementComplet } from './croisement-complet.ts';
import { croisementEtendu } from './croisement-etendu.ts';
import { croisement } from './croisement.ts';
import { groupeCache } from './groupe-cache.ts';
import { groupeNu } from './groupe-nu.ts';
import { longueurUnique } from './longueur-unique.ts';
import { motifUnique } from './motif-unique.ts';
import { placeUnique } from './place-unique.ts';

const INFOS = { id: 'forcing', niveau: 'diabolique' } as const;

const OPTIONS = {
  possibilitesMax: 3,
  parNombre: true,
  absurde: true,
  impasseEtapesMax: IMPASSE_ETAPES_MAX,
  techniques: [longueurUnique, motifUnique, placeUnique, croisement, groupeNu, groupeCache, croisementEtendu, croisementComplet],
};

function chercher(p: Probleme, etat: EtatSolveur): EtapeCases | null {
  return chercherHypothese(INFOS, p, etat, OPTIONS, 'en poursuivant le raisonnement jusqu\'au bout');
}

export const forcing: TechniqueCases = { ...INFOS, nom: 'Hypothèses', chercher };
