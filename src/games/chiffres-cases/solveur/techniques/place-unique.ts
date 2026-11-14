// UNE SEULE PLACE (Facile) : un nombre libre ne peut aller que dans un seul des emplacements
// vides de sa longueur → il va là. Code pur.

import { nomEmplacement } from '../../grille.ts';
import type { Probleme } from '../../probleme.ts';
import { emplacementsLibres, nombresLibres, type EtatSolveur } from '../etat.ts';
import { construireEtape, type EtapeCases, type TechniqueCases } from '../technique.ts';

const INFOS = { id: 'place-unique', niveau: 'facile' } as const;

function chercher(p: Probleme, etat: EtatSolveur): EtapeCases | null {
  for (const longueur of p.longueurs) {
    const libres = emplacementsLibres(p, etat, longueur);
    if (libres.length < 2) continue; // un seul emplacement : c'est « longueur unique » ou « un seul nombre »
    for (const nombre of nombresLibres(p, etat, longueur)) {
      const [emplacement, ...autres] = libres.filter((id) => etat.candidats[id]?.includes(nombre) === true);
      if (emplacement === undefined || autres.length > 0) continue;
      const etape = construireEtape(
        INFOS,
        etat,
        [emplacement],
        [{ emplacement, nombre }],
        [],
        `Le nombre ${p.nombres[nombre] ?? ''} ne peut aller dans aucun autre emplacement de ${longueur} cases que ${nomEmplacement(p.grille, emplacement)}.`,
      );
      if (etape !== null) return etape;
    }
  }
  return null;
}

export const placeUnique: TechniqueCases = { ...INFOS, nom: 'Une seule place', chercher };
