// GROUPE D'EMPLACEMENTS (Difficile) : k emplacements vides de même longueur (k = 2 à 4) n'ont, à
// eux tous, que k nombres candidats → ces k nombres y vont forcément, ils sont retirés des
// autres emplacements de cette longueur. Code pur.

import { nomEmplacement } from '../../grille.ts';
import type { Probleme } from '../../probleme.ts';
import { emplacementsLibres, type EtatSolveur } from '../etat.ts';
import { combinaisons, construireEtape, enumerer, textes, type EtapeCases, type TechniqueCases } from '../technique.ts';

const INFOS = { id: 'groupe-nu', niveau: 'difficile' } as const;

export const TAILLE_MAX_GROUPE = 4;

function chercher(p: Probleme, etat: EtatSolveur): EtapeCases | null {
  for (let k = 2; k <= TAILLE_MAX_GROUPE; k++) {
    for (const longueur of p.longueurs) {
      const libres = emplacementsLibres(p, etat, longueur);
      if (libres.length <= k) continue;
      // Seuls les emplacements qui ont au plus k candidats peuvent faire partie du groupe
      const petits = libres.filter((id) => (etat.candidats[id] ?? []).length <= k);
      for (const groupe of combinaisons(petits, k)) {
        const nombres = [...new Set(groupe.flatMap((id) => etat.candidats[id] ?? []))].sort((a, b) => a - b);
        if (nombres.length !== k) continue;
        const autres = libres.filter((id) => !groupe.includes(id));
        const etape = construireEtape(
          INFOS,
          etat,
          groupe,
          [],
          autres.map((emplacement) => ({ emplacement, nombres })),
          `Les ${k} emplacements ${enumerer(groupe.map((id) => nomEmplacement(p.grille, id).replace(/^(l'|le )/, '')))} ne peuvent recevoir que ${enumerer(textes(p, nombres))} : ces ${k} nombres y vont forcément, ils sont donc impossibles dans les autres emplacements de ${longueur} cases.`,
        );
        if (etape !== null) return etape;
      }
    }
  }
  return null;
}

export const groupeNu: TechniqueCases = { ...INFOS, nom: 'Groupe d\'emplacements', chercher };
