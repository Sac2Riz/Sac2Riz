// CROISEMENT (logique partagée par « croisement » et « croisement-etendu »). Code pur.
//
// Dans une case encore vide commune à deux emplacements S et T, les nombres encore possibles dans S
// n'y autorisent que certains chiffres ; un nombre possible dans T dont le chiffre à cet endroit
// n'en fait pas partie est éliminé de T.
// « candidatsMax » limite la taille de S : un joueur repère facilement qu'un emplacement qui n'a plus
// que 2 ou 3 nombres possibles impose ses chiffres ; comparer deux longues listes est bien plus dur.

import { nomCase, nomEmplacement } from '../../grille.ts';
import type { Probleme } from '../../probleme.ts';
import type { EtatSolveur } from '../etat.ts';
import { construireEtape, enumerer, textes, type EtapeCases, type TechniqueCases } from '../technique.ts';

const listeChiffres = (chiffres: ReadonlySet<number>): string =>
  enumerer([...chiffres].sort((a, b) => a - b).map(String), 'ou');

export function chercherCroisement(
  infos: Pick<TechniqueCases, 'id' | 'niveau'>,
  p: Probleme,
  etat: EtatSolveur,
  candidatsMax: number,
): EtapeCases | null {
  for (const s of p.grille.emplacements) {
    const source = etat.candidats[s.id] ?? [];
    if ((etat.affectes[s.id] ?? -1) >= 0 || source.length > candidatsMax) continue;
    for (const cr of p.grille.croisements[s.id] ?? []) {
      if ((etat.affectes[cr.autre] ?? -1) >= 0) continue;
      const permis = new Set(source.map((n) => p.chiffres[n]?.[cr.position] ?? -1));
      const exclus = (etat.candidats[cr.autre] ?? []).filter((n) => !permis.has(p.chiffres[n]?.[cr.positionAutre] ?? -1));
      if (exclus.length === 0) continue;
      const nomS = nomEmplacement(p.grille, s.id);
      const raison =
        source.length <= 3
          ? `${nomS} ne peut recevoir que ${enumerer(textes(p, source), 'ou')}`
          : `les ${source.length} nombres encore possibles dans ${nomS}`;
      const etape = construireEtape(
        infos,
        etat,
        [s.id, cr.autre],
        [],
        [{ emplacement: cr.autre, nombres: exclus }],
        `Au croisement ${nomCase(p.grille, cr.cellule)}, ${raison} : le chiffre y est donc ${listeChiffres(permis)}. ` +
          `${enumerer(textes(p, exclus))} ${exclus.length > 1 ? 'sont donc impossibles' : 'est donc impossible'} dans ${nomEmplacement(p.grille, cr.autre)}.`,
      );
      if (etape !== null) return etape;
    }
  }
  return null;
}
