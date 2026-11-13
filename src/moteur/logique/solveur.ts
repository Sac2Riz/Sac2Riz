// Solveur logique : applique les techniques de la plus simple à la plus dure, en revenant à la
// plus simple dès qu'une technique a fait progresser la grille (voir docs/DIFFICULTE.md).
// Il s'arrête proprement quand plus rien ne progresse (statut « bloque ») : c'est ce qui permet
// de rejeter les grilles qui exigent de l'essai-erreur. Code pur.

import type { ValeursGrille } from '../../types/grille.ts';
import type { EtatLogique, Etape, ResultatLogique } from '../../types/logique.ts';
import { NIVEAUX, type Niveau } from '../../types/niveaux.ts';
import type { Contexte } from './contexte.ts';
import { aDesEffets, appliquerEtape, contradiction, estRemplie, etatInitial } from './etat.ts';
import type { Technique } from './technique.ts';
import { TECHNIQUES } from './techniques/index.ts';

export type OptionsSolveur = {
  /** Niveau le plus élevé autorisé : les techniques plus dures ne sont pas essayées. */
  readonly niveauMax: Niveau;
  /** Techniques à utiliser, dans l'ordre (par défaut : toutes). Utile aux tests. */
  readonly techniques: readonly Technique[];
};

const OPTIONS_PAR_DEFAUT: OptionsSolveur = { niveauMax: 'diabolique', techniques: TECHNIQUES };

/** Techniques dont le niveau ne dépasse pas niveauMax. */
function autorisees(techniques: readonly Technique[], niveauMax: Niveau): Technique[] {
  const max = NIVEAUX.indexOf(niveauMax);
  return techniques.filter((t) => NIVEAUX.indexOf(t.niveau) <= max);
}

/** Première étape trouvée en essayant les techniques dans l'ordre, ou null si aucune ne progresse. */
export function prochaineEtape(
  ctx: Contexte,
  etat: EtatLogique,
  techniques: readonly Technique[] = TECHNIQUES,
): Etape | null {
  for (const technique of techniques) {
    const etape = technique.chercher(ctx, etat);
    if (etape !== null) return etape;
  }
  return null;
}

/** Résout une grille (0 = case vide) par la seule logique. */
export function resoudreLogique(
  ctx: Contexte,
  valeurs: ValeursGrille,
  options: Partial<OptionsSolveur> = {},
): ResultatLogique {
  const { niveauMax, techniques } = { ...OPTIONS_PAR_DEFAUT, ...options };
  const liste = autorisees(techniques, niveauMax);
  const etapes: Etape[] = [];
  let etat = etatInitial(ctx, valeurs);

  for (;;) {
    const raison = contradiction(ctx, etat);
    if (raison !== null) return { statut: 'contradiction', etapes, etat, raison };
    if (estRemplie(etat)) return { statut: 'resolu', etapes, etat, raison: null };
    const etape = prochaineEtape(ctx, etat, liste);
    if (etape === null) return { statut: 'bloque', etapes, etat, raison: null };
    // Garde-fou : une étape sans effet ferait tourner le solveur en rond indéfiniment
    if (!aDesEffets(etat, etape)) {
      throw new Error(
        `Solveur logique : la technique « ${etape.technique} » a renvoyé une étape sans effet ` +
          `(« ${etape.explication} »). Arrêt pour éviter une boucle infinie.`,
      );
    }
    etat = appliquerEtape(ctx, etat, etape);
    etapes.push(etape);
  }
}
