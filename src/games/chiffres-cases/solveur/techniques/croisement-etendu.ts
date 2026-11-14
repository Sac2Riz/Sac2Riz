// CROISEMENT ÉTENDU (Difficile) : comme le croisement, mais l'emplacement qui impose ses
// chiffres peut avoir jusqu'à 6 nombres possibles. Voir familles/croisement.ts.

import type { Probleme } from '../../probleme.ts';
import type { EtatSolveur } from '../etat.ts';
import { chercherCroisement } from '../familles/croisement.ts';
import type { EtapeCases, TechniqueCases } from '../technique.ts';

const INFOS = { id: 'croisement-etendu', niveau: 'difficile' } as const;

/** Nombre maximal de candidats de l'emplacement qui impose ses chiffres. */
export const CANDIDATS_MAX_CROISEMENT_ETENDU = 4;

function chercher(p: Probleme, etat: EtatSolveur): EtapeCases | null {
  return chercherCroisement(INFOS, p, etat, CANDIDATS_MAX_CROISEMENT_ETENDU);
}

export const croisementEtendu: TechniqueCases = { ...INFOS, nom: 'Croisement étendu', chercher };
