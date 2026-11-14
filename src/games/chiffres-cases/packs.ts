// PACKS des chiffres casés : grilles Expert et Diabolique pré-générées (npm run packs), propres
// à ce jeu (le format PackSudoku du socle décrit des grilles de sudoku). Converties en Puzzle pour
// le socle (socle/packs.ts). Diabolique est servi UNIQUEMENT par son pack (voir meta.ts).
//
// Une grille est écrite ligne par ligne en texte : « # » = case noire, un chiffre par case blanche,
// lignes séparées par « / » (ex. "12#3/4567/…"). Garde de validation : on ne fait jamais confiance
// à un fichier ; l'unicité et la notation exacte sont vérifiées par les tests.

import type { Puzzle } from '../../types/jeu.ts';
import { estForce, estNiveau, INFOS_NIVEAUX, NIVEAUX, type Niveau, type Notation } from '../../types/niveaux.ts';
import { estEntierEntre, estObjet, estTableauDe } from '../../utils/gardes-json.ts';
import { estDonneesCases } from './gardes.ts';
import { META } from './meta.ts';
import { VERSION_NOTATION_CASES } from './notation.ts';
import { IDS_TECHNIQUES_CASES } from './solveur/technique.ts';
import { TECHNIQUES_CASES } from './solveur/techniques/index.ts';
import { NOIRE, type DonneesCases } from './types.ts';

/** Version du format des packs de ce jeu ; à incrémenter si la forme de PackCases change. */
export const VERSION_FORMAT_PACK_CASES = 1;

/** Niveaux qui ont un pack (fichier packs/<niveau>.json). */
export const NIVEAUX_AVEC_PACK: readonly Niveau[] = ['expert', 'diabolique'];

export type GrillePackCases = {
  /** Graine qui l'a générée (genererCases avec les paramètres par défaut du niveau). */
  readonly graine: number;
  /** Solution, ligne par ligne : « # » = noire, chiffres, lignes séparées par « / ». */
  readonly grille: string;
  /** Emplacements pré-placés (triés). */
  readonly preplaces: readonly number[];
  readonly notation: Notation;
};

export type PackCases = {
  readonly version: number;
  /** VERSION_NOTATION_CASES au moment de la génération : un pack d'une autre version est refusé. */
  readonly versionNotation: number;
  readonly jeu: string;
  readonly niveau: Niveau;
  readonly grilles: readonly GrillePackCases[];
};

/** Données → texte ligne par ligne. */
export function donneesEnTexte(donnees: DonneesCases): string {
  const lignes: string[] = [];
  for (let l = 0; l < donnees.hauteur; l++) {
    const ligne = donnees.solution.slice(l * donnees.largeur, (l + 1) * donnees.largeur);
    lignes.push(ligne.map((v) => (v === NOIRE ? '#' : String(v))).join(''));
  }
  return lignes.join('/');
}

/** Texte → données (null si le texte n'est pas rectangulaire ou contient un caractère inconnu). */
export function texteEnDonnees(texte: string, preplaces: readonly number[]): DonneesCases | null {
  const lignes = texte.split('/');
  const largeur = lignes[0]?.length ?? 0;
  if (lignes.some((l) => l.length !== largeur || !/^[#0-9]*$/.test(l))) return null;
  const solution = lignes.flatMap((l) => [...l].map((c) => (c === '#' ? NOIRE : Number(c))));
  return { largeur, hauteur: lignes.length, solution, preplaces: [...preplaces] };
}

const IDS: readonly string[] = IDS_TECHNIQUES_CASES;
const estIdTechnique = (v: unknown): v is string => typeof v === 'string' && IDS.includes(v);
const niveauTechnique = (id: string): Niveau => TECHNIQUES_CASES.find((t) => t.id === id)?.niveau ?? 'diabolique';
const rang = (niveau: Niveau): number => NIVEAUX.indexOf(niveau);

/** Notation cohérente avec le niveau du pack (même règle que pour le sudoku : moteur/pack.ts). */
function estNotationDuNiveau(v: unknown, niveau: Niveau): v is Notation {
  if (!estObjet(v) || v['niveau'] !== niveau) return false;
  const { force, techniqueMax, details } = v;
  const { forceMin, forceMax } = INFOS_NIVEAUX[niveau];
  if (!estForce(force) || force < forceMin || force > forceMax) return false;
  if (!estIdTechnique(techniqueMax) || niveauTechnique(techniqueMax) !== niveau) return false;
  if (!estObjet(details) || !estEntierEntre(details[techniqueMax], 1, Number.MAX_SAFE_INTEGER)) return false;
  return Object.entries(details).every(
    ([id, nombre]) =>
      estIdTechnique(id) && estEntierEntre(nombre, 1, Number.MAX_SAFE_INTEGER) && rang(niveauTechnique(id)) <= rang(niveau),
  );
}

function estGrillePack(v: unknown, niveau: Niveau): v is GrillePackCases {
  if (!estObjet(v)) return false;
  const { graine, grille, preplaces, notation } = v;
  if (!estEntierEntre(graine, 0, 4294967295) || typeof grille !== 'string') return false;
  if (!estTableauDe(preplaces, (n): n is number => estEntierEntre(n, 0, Number.MAX_SAFE_INTEGER))) return false;
  const donnees = texteEnDonnees(grille, preplaces);
  return donnees !== null && estDonneesCases(donnees) && estNotationDuNiveau(notation, niveau);
}

/** Vrai si la valeur est un pack valide, au format et à la version de notation actuels. */
export function estPackCases(v: unknown): v is PackCases {
  if (!estObjet(v)) return false;
  const { version, versionNotation, jeu, niveau, grilles } = v;
  return (
    version === VERSION_FORMAT_PACK_CASES &&
    versionNotation === VERSION_NOTATION_CASES &&
    jeu === META.id &&
    estNiveau(niveau) &&
    Array.isArray(grilles) &&
    grilles.length > 0 &&
    grilles.every((g) => estGrillePack(g, niveau))
  );
}

/** Grilles d'un pack déjà validé, sous forme de Puzzle (code pur, testé sous Node). */
export function convertirPack(pack: PackCases): Puzzle<DonneesCases>[] {
  return pack.grilles.flatMap((g) => {
    const donnees = texteEnDonnees(g.grille, g.preplaces);
    return donnees === null ? [] : [{ jeu: META.id, graine: g.graine, notation: g.notation, donnees }];
  });
}

/** Télécharge (depuis l'appli elle-même, hors ligne une fois en cache) et vérifie le pack du niveau. */
export async function chargerPack(niveau: Niveau): Promise<Puzzle<DonneesCases>[] | null> {
  if (!NIVEAUX_AVEC_PACK.includes(niveau)) return null;
  const reponse = await fetch(new URL(`./packs/${niveau}.json`, import.meta.url));
  if (!reponse.ok) throw new Error(`Pack ${niveau} introuvable (${reponse.status})`);
  const contenu: unknown = await reponse.json();
  if (!estPackCases(contenu) || contenu.niveau !== niveau) throw new Error(`Pack ${niveau} invalide ou d'une autre version`);
  return convertirPack(contenu);
}
