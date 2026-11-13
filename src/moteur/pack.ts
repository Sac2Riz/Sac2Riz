// Packs de grilles (famille sudoku) : conversion des grilles en texte et garde de validation.
// La garde vérifie la forme et la cohérence d'un pack chargé (on ne fait jamais confiance à un
// fichier) ; l'unicité de la solution et la notation exacte sont vérifiées par les tests. Code pur.

import { IDS_TECHNIQUES, type IdTechnique } from '../types/logique.ts';
import { estForce, estNiveau, INFOS_NIVEAUX, NIVEAUX, type Niveau, type Notation } from '../types/niveaux.ts';
import { VERSION_FORMAT_PACK, type GrillePack, type PackSudoku } from '../types/pack.ts';
import { estEntierEntre, estObjet } from '../utils/gardes-json.ts';
import { techniqueParId } from './logique/techniques/index.ts';
import { VERSION_NOTATION } from './notation.ts';

/** Grille → texte, un chiffre par case (0 = vide). Valeurs de 0 à 9 uniquement. */
export function grilleEnTexte(valeurs: readonly number[]): string {
  return valeurs.join('');
}

/** Texte → grille (inverse de grilleEnTexte). */
export function texteEnGrille(texte: string): number[] {
  return [...texte].map(Number);
}

function estIdTechnique(valeur: unknown): valeur is IdTechnique {
  return typeof valeur === 'string' && (IDS_TECHNIQUES as readonly string[]).includes(valeur);
}

const rangNiveau = (niveau: Niveau): number => NIVEAUX.indexOf(niveau);

/**
 * Notation cohérente avec le niveau du pack : force dans la plage du niveau, technique max
 * de ce niveau et utilisée, détails = techniques connues, utilisées au moins une fois,
 * jamais plus dures que le niveau.
 */
function estNotationDuNiveau(valeur: unknown, niveau: Niveau): valeur is Notation {
  if (!estObjet(valeur) || valeur['niveau'] !== niveau) return false;
  const { force, techniqueMax, details } = valeur;
  const { forceMin, forceMax } = INFOS_NIVEAUX[niveau];
  if (!estForce(force) || force < forceMin || force > forceMax) return false;
  if (!estIdTechnique(techniqueMax) || techniqueParId(techniqueMax).niveau !== niveau) return false;
  if (!estObjet(details) || !estEntierEntre(details[techniqueMax], 1, Number.MAX_SAFE_INTEGER)) return false;
  return Object.entries(details).every(
    ([id, nombre]) =>
      estIdTechnique(id) &&
      estEntierEntre(nombre, 1, Number.MAX_SAFE_INTEGER) &&
      rangNiveau(techniqueParId(id).niveau) <= rangNiveau(niveau),
  );
}

/** Texte de nombreCellules chiffres compris entre min et max. */
function estTexteGrille(valeur: unknown, nombreCellules: number, min: number, max: number): valeur is string {
  if (typeof valeur !== 'string' || valeur.length !== nombreCellules) return false;
  return [...valeur].every((car) => /^\d$/.test(car) && Number(car) >= min && Number(car) <= max);
}

function estGrillePack(valeur: unknown, niveau: Niveau, taille: number): valeur is GrillePack {
  if (!estObjet(valeur)) return false;
  const { graine, enonce, solution, notation } = valeur;
  const n = taille * taille;
  if (!estEntierEntre(graine, 0, 4294967295)) return false;
  if (!estTexteGrille(enonce, n, 0, taille) || !estTexteGrille(solution, n, 1, taille)) return false;
  // Chaque chiffre donné est celui de la solution
  if (![...enonce].every((car, c) => car === '0' || car === solution[c])) return false;
  return estNotationDuNiveau(notation, niveau);
}

/**
 * Vrai si la valeur est un pack valide pour une grille taille × taille (valeurs 1 à taille ≤ 9),
 * au format et à la version de notation actuels.
 */
export function estPackSudoku(valeur: unknown, taille = 9): valeur is PackSudoku {
  if (!estObjet(valeur)) return false;
  const { version, versionNotation, jeu, niveau, grilles } = valeur;
  return (
    version === VERSION_FORMAT_PACK &&
    versionNotation === VERSION_NOTATION &&
    typeof jeu === 'string' &&
    jeu.length > 0 &&
    estNiveau(niveau) &&
    Array.isArray(grilles) &&
    grilles.length > 0 &&
    grilles.every((g) => estGrillePack(g, niveau, taille))
  );
}
