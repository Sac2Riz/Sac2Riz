// SOLVEUR LOGIQUE des chiffres casés : applique les techniques de la plus simple à la plus dure et
// revient à la plus simple après chaque progrès (comme le solveur du sudoku). Code pur.
// Statut « bloque » : plus rien ne progresse avec les techniques permises (essai-erreur nécessaire
// ou solutions multiples) → la grille est rejetée.

import { NIVEAUX, type Niveau } from '../../../types/niveaux.ts';
import type { Probleme } from '../probleme.ts';
import { contradiction, estResolu, type EtatSolveur } from './etat.ts';
import { appliquerEtape } from './hypotheses.ts';
import type { EtapeCases, TechniqueCases } from './technique.ts';
import { TECHNIQUES_CASES } from './techniques/index.ts';

export type ResultatSolveur = {
  readonly statut: 'resolu' | 'bloque' | 'contradiction';
  readonly etapes: readonly EtapeCases[];
  readonly etat: EtatSolveur;
};

/** Techniques permises jusqu'à un niveau (toutes par défaut). */
export function techniquesJusqua(niveauMax: Niveau = 'diabolique'): readonly TechniqueCases[] {
  const rang = NIVEAUX.indexOf(niveauMax);
  return TECHNIQUES_CASES.filter((t) => NIVEAUX.indexOf(t.niveau) <= rang);
}

/** Première étape trouvée (la technique la plus simple qui progresse), ou null. */
export function prochaineEtape(
  p: Probleme,
  etat: EtatSolveur,
  techniques: readonly TechniqueCases[] = TECHNIQUES_CASES,
): EtapeCases | null {
  for (const t of techniques) {
    const etape = t.chercher(p, etat);
    if (etape !== null) return etape;
  }
  return null;
}

export function resoudre(p: Probleme, depart: EtatSolveur, niveauMax: Niveau = 'diabolique'): ResultatSolveur {
  const techniques = techniquesJusqua(niveauMax);
  const etapes: EtapeCases[] = [];
  let etat = depart;
  for (;;) {
    if (contradiction(p, etat)) return { statut: 'contradiction', etapes, etat };
    if (estResolu(etat)) return { statut: 'resolu', etapes, etat };
    const etape = prochaineEtape(p, etat, techniques);
    if (etape === null) return { statut: 'bloque', etapes, etat };
    const suivant = appliquerEtape(p, etat, etape);
    // Garde-fou : une étape doit toujours avoir un effet (sinon on bouclerait)
    if (suivant.affectes.every((n, i) => n === etat.affectes[i]) && suivant.candidats.every((c, i) => c.length === etat.candidats[i]?.length)) {
      throw new Error(`Étape sans effet (${etape.technique})`);
    }
    etapes.push(etape);
    etat = suivant;
  }
}
