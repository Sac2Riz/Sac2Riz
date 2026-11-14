// UN SEUL NOMBRE POSSIBLE (Débutant) : dans un emplacement, un seul des nombres libres de sa
// longueur correspond aux chiffres déjà écrits (ou aux éliminations déjà faites). Code pur.

import { nomEmplacement } from '../../grille.ts';
import type { Probleme } from '../../probleme.ts';
import type { EtatSolveur } from '../etat.ts';
import { construireEtape, motifEcrit, type EtapeCases, type TechniqueCases } from '../technique.ts';

const INFOS = { id: 'motif-unique', niveau: 'debutant' } as const;

function chercher(p: Probleme, etat: EtatSolveur): EtapeCases | null {
  for (const e of p.grille.emplacements) {
    if ((etat.affectes[e.id] ?? -1) >= 0) continue;
    const [nombre, ...autres] = etat.candidats[e.id] ?? [];
    if (nombre === undefined || autres.length > 0) continue;
    const motif = motifEcrit(p, etat, e.id);
    const raison = motif === null ? '' : ` avec les chiffres déjà écrits (${motif})`;
    const etape = construireEtape(
      INFOS,
      etat,
      [e.id],
      [{ emplacement: e.id, nombre }],
      [],
      `Parmi les nombres de ${e.cellules.length} chiffres encore libres, seul ${p.nombres[nombre] ?? ''} peut aller dans ${nomEmplacement(p.grille, e.id)}${raison}.`,
    );
    if (etape !== null) return etape;
  }
  return null;
}

export const motifUnique: TechniqueCases = { ...INFOS, nom: 'Un seul nombre possible', chercher };
