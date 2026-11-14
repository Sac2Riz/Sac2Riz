// LONGUEUR UNIQUE (Débutant) : il ne reste qu'un emplacement d'une certaine longueur et qu'un
// nombre de cette longueur → ce nombre va dans cet emplacement. Code pur.

import { nomEmplacement } from '../../grille.ts';
import type { Probleme } from '../../probleme.ts';
import { emplacementsLibres, nombresLibres, type EtatSolveur } from '../etat.ts';
import { construireEtape, type EtapeCases, type TechniqueCases } from '../technique.ts';

const INFOS = { id: 'longueur-unique', niveau: 'debutant' } as const;

function chercher(p: Probleme, etat: EtatSolveur): EtapeCases | null {
  for (const longueur of p.longueurs) {
    const [emplacement, ...autres] = emplacementsLibres(p, etat, longueur);
    const [nombre, ...autresNombres] = nombresLibres(p, etat, longueur);
    if (emplacement === undefined || nombre === undefined || autres.length > 0 || autresNombres.length > 0) continue;
    if (etat.candidats[emplacement]?.includes(nombre) !== true) continue; // état contradictoire
    const texte = p.nombres[nombre] ?? '';
    const total = (p.nombresParLongueur.get(longueur) ?? []).length;
    const debut =
      total === 1
        ? `${texte} est le seul nombre de ${longueur} chiffres`
        : `${texte} est le dernier nombre de ${longueur} chiffres à placer`;
    const etape = construireEtape(
      INFOS,
      etat,
      [emplacement],
      [{ emplacement, nombre }],
      [],
      `${debut}, et ${nomEmplacement(p.grille, emplacement)} est le dernier emplacement de ${longueur} cases encore vide : il va donc là.`,
    );
    if (etape !== null) return etape;
  }
  return null;
}

export const longueurUnique: TechniqueCases = { ...INFOS, nom: 'Longueur unique', chercher };
