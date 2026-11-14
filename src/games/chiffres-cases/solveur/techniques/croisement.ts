// CROISEMENT (Moyen) : un emplacement qui n'a plus que 2 ou 3 nombres possibles n'autorise que
// quelques chiffres dans chacune de ses cases ; les nombres des emplacements qui le croisent qui
// n'ont pas l'un de ces chiffres au croisement sont éliminés. Voir familles/croisement.ts.

import type { Probleme } from '../../probleme.ts';
import type { EtatSolveur } from '../etat.ts';
import { chercherCroisement } from '../familles/croisement.ts';
import type { EtapeCases, TechniqueCases } from '../technique.ts';

const INFOS = { id: 'croisement', niveau: 'moyen' } as const;

/** Nombre maximal de candidats de l'emplacement qui impose ses chiffres. */
export const CANDIDATS_MAX_CROISEMENT = 3;

function chercher(p: Probleme, etat: EtatSolveur): EtapeCases | null {
  return chercherCroisement(INFOS, p, etat, CANDIDATS_MAX_CROISEMENT);
}

export const croisement: TechniqueCases = { ...INFOS, nom: 'Croisement', chercher };
