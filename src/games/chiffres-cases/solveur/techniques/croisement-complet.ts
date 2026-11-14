// CROISEMENT COMPLET (Expert) : comme le croisement, mais l'emplacement qui impose ses chiffres
// peut avoir n'importe quel nombre de candidats : il faut comparer de longues listes de nombres.
// Voir familles/croisement.ts.

import type { Probleme } from '../../probleme.ts';
import type { EtatSolveur } from '../etat.ts';
import { chercherCroisement } from '../familles/croisement.ts';
import type { EtapeCases, TechniqueCases } from '../technique.ts';

const INFOS = { id: 'croisement-complet', niveau: 'expert' } as const;

function chercher(p: Probleme, etat: EtatSolveur): EtapeCases | null {
  return chercherCroisement(INFOS, p, etat, Infinity);
}

export const croisementComplet: TechniqueCases = { ...INFOS, nom: 'Croisement complet', chercher };
