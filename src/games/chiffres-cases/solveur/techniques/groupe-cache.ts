// GROUPE DE NOMBRES (Difficile) : k nombres libres de même longueur (k = 2 à 4) ne peuvent aller,
// à eux tous, que dans k emplacements → ces emplacements leur sont réservés, ils perdent leurs
// autres candidats. Code pur.

import { nomEmplacement } from '../../grille.ts';
import type { Probleme } from '../../probleme.ts';
import { emplacementsLibres, nombresLibres, type EtatSolveur } from '../etat.ts';
import { combinaisons, construireEtape, enumerer, textes, type EtapeCases, type TechniqueCases } from '../technique.ts';
import { TAILLE_MAX_GROUPE } from './groupe-nu.ts';

const INFOS = { id: 'groupe-cache', niveau: 'difficile' } as const;

function chercher(p: Probleme, etat: EtatSolveur): EtapeCases | null {
  for (let k = 2; k <= TAILLE_MAX_GROUPE; k++) {
    for (const longueur of p.longueurs) {
      const libres = emplacementsLibres(p, etat, longueur);
      if (libres.length <= k) continue;
      const placesDe = new Map(
        nombresLibres(p, etat, longueur).map((n) => [n, libres.filter((id) => etat.candidats[id]?.includes(n) === true)]),
      );
      const petits = [...placesDe.keys()].filter((n) => (placesDe.get(n) ?? []).length <= k);
      for (const nombres of combinaisons(petits, k)) {
        const places = [...new Set(nombres.flatMap((n) => placesDe.get(n) ?? []))].sort((a, b) => a - b);
        if (places.length !== k) continue;
        const eliminations = places.map((emplacement) => ({
          emplacement,
          nombres: (etat.candidats[emplacement] ?? []).filter((n) => !nombres.includes(n)),
        }));
        const etape = construireEtape(
          INFOS,
          etat,
          places,
          [],
          eliminations,
          `Les nombres ${enumerer(textes(p, nombres))} ne peuvent aller que dans ${enumerer(places.map((id) => nomEmplacement(p.grille, id)))} : ces ${k} emplacements leur sont réservés, les autres nombres y sont impossibles.`,
        );
        if (etape !== null) return etape;
      }
    }
  }
  return null;
}

export const groupeCache: TechniqueCases = { ...INFOS, nom: 'Groupe de nombres', chercher };
