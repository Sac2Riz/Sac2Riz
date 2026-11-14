// PACKS du Tectonic : grilles Difficile, Expert et Diabolique pré-générées (npm run packs), servies
// quand la réserve est vide (voir meta.ts : ces niveaux sont aussi réalimentés en arrière-plan).
// Converties en Puzzle pour le socle (socle/packs.ts).
//
// Une grille est écrite en trois textes ligne par ligne (lignes séparées par « / ») :
//   - zones : numéro de zone de chaque case en base 36 (0-9 puis a-z) ;
//   - solution : un chiffre par case ;
//   - enonce : un chiffre par case donnée, « . » pour une case à remplir.
// Garde de validation : on ne fait jamais confiance à un fichier ; l'unicité et la notation exacte
// sont vérifiées par les tests (packs.long.ts).

import type { Puzzle } from '../../types/jeu.ts';
import { estForce, estNiveau, INFOS_NIVEAUX, NIVEAUX, type Niveau, type Notation } from '../../types/niveaux.ts';
import { estEntierEntre, estObjet } from '../../utils/gardes-json.ts';
import { estDonnees } from './gardes.ts';
import { META } from './meta.ts';
import { VERSION_NOTATION_TECTONIC } from './notation.ts';
import { IDS_TECHNIQUES_TECTONIC, TECHNIQUES_TECTONIC } from './techniques.ts';
import type { DonneesTectonic } from './types.ts';

/** Version du format des packs de ce jeu ; à incrémenter si la forme de PackTectonic change. */
export const VERSION_FORMAT_PACK_TECTONIC = 1;

/** Niveaux qui ont un pack (fichier packs/<niveau>.json). */
export const NIVEAUX_AVEC_PACK: readonly Niveau[] = ['difficile', 'expert', 'diabolique'];

export type GrillePackTectonic = {
  /** Graine qui l'a générée (genererTectonic avec les réglages par défaut du niveau). */
  readonly graine: number;
  readonly zones: string;
  readonly solution: string;
  readonly enonce: string;
  readonly notation: Notation;
};

export type PackTectonic = {
  readonly version: number;
  /** VERSION_NOTATION_TECTONIC au moment de la génération : un pack d'une autre version est refusé. */
  readonly versionNotation: number;
  readonly jeu: string;
  readonly niveau: Niveau;
  readonly grilles: readonly GrillePackTectonic[];
};

/** Valeurs → texte ligne par ligne (un caractère par case). */
function enTexte(valeurs: readonly number[], colonnes: number, caractere: (v: number) => string): string {
  const lignes: string[] = [];
  for (let i = 0; i < valeurs.length; i += colonnes) lignes.push(valeurs.slice(i, i + colonnes).map(caractere).join(''));
  return lignes.join('/');
}

/** Données → les trois textes d'une grille de pack. */
export function donneesEnTextes(d: DonneesTectonic): Pick<GrillePackTectonic, 'zones' | 'solution' | 'enonce'> {
  return {
    zones: enTexte(d.zones, d.colonnes, (z) => z.toString(36)),
    solution: enTexte(d.solution, d.colonnes, String),
    enonce: enTexte(d.enonce, d.colonnes, (v) => (v === 0 ? '.' : String(v))),
  };
}

/** Lignes d'un texte, toutes de même longueur et faites des caractères permis ; null sinon. */
function lignesDe(texte: string, permis: RegExp): string[] | null {
  const lignes = texte.split('/');
  const largeur = lignes[0]?.length ?? 0;
  return largeur > 0 && lignes.every((l) => l.length === largeur && permis.test(l)) ? lignes : null;
}

/** Textes → données (null si un texte est mal formé ou si les dimensions diffèrent). Non validées : voir estDonnees. */
export function textesEnDonnees(g: Pick<GrillePackTectonic, 'zones' | 'solution' | 'enonce'>): DonneesTectonic | null {
  const zones = lignesDe(g.zones, /^[0-9a-z]+$/);
  const solution = lignesDe(g.solution, /^[0-9]+$/);
  const enonce = lignesDe(g.enonce, /^[0-9.]+$/);
  if (zones === null || solution === null || enonce === null) return null;
  const memes = (a: string[]): boolean => a.length === zones.length && a[0]?.length === zones[0]?.length;
  if (!memes(solution) || !memes(enonce)) return null;
  return {
    lignes: zones.length,
    colonnes: zones[0]?.length ?? 0,
    zones: zones.flatMap((l) => [...l].map((c) => parseInt(c, 36))),
    solution: solution.flatMap((l) => [...l].map(Number)),
    enonce: enonce.flatMap((l) => [...l].map((c) => (c === '.' ? 0 : Number(c)))),
  };
}

const IDS: readonly string[] = IDS_TECHNIQUES_TECTONIC;
const estIdTechnique = (v: unknown): v is string => typeof v === 'string' && IDS.includes(v);
const niveauTechnique = (id: string): Niveau => TECHNIQUES_TECTONIC.find((t) => t.id === id)?.niveau ?? 'diabolique';
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

function estGrillePack(v: unknown, niveau: Niveau): v is GrillePackTectonic {
  if (!estObjet(v)) return false;
  const { graine, zones, solution, enonce, notation } = v;
  if (!estEntierEntre(graine, 0, 4294967295)) return false;
  if (typeof zones !== 'string' || typeof solution !== 'string' || typeof enonce !== 'string') return false;
  const donnees = textesEnDonnees({ zones, solution, enonce });
  return donnees !== null && estDonnees(donnees) && estNotationDuNiveau(notation, niveau);
}

/** Vrai si la valeur est un pack valide, au format et à la version de notation actuels. */
export function estPackTectonic(v: unknown): v is PackTectonic {
  if (!estObjet(v)) return false;
  const { version, versionNotation, jeu, niveau, grilles } = v;
  return (
    version === VERSION_FORMAT_PACK_TECTONIC &&
    versionNotation === VERSION_NOTATION_TECTONIC &&
    jeu === META.id &&
    estNiveau(niveau) &&
    Array.isArray(grilles) &&
    grilles.length > 0 &&
    grilles.every((g) => estGrillePack(g, niveau))
  );
}

/** Grilles d'un pack déjà validé, sous forme de Puzzle (code pur, testé sous Node). */
export function convertirPack(pack: PackTectonic): Puzzle<DonneesTectonic>[] {
  return pack.grilles.flatMap((g) => {
    const donnees = textesEnDonnees(g);
    return donnees === null ? [] : [{ jeu: META.id, graine: g.graine, notation: g.notation, donnees }];
  });
}

/** Télécharge (depuis l'appli elle-même, hors ligne une fois en cache) et vérifie le pack du niveau. */
export async function chargerPack(niveau: Niveau): Promise<Puzzle<DonneesTectonic>[] | null> {
  if (!NIVEAUX_AVEC_PACK.includes(niveau)) return null;
  const reponse = await fetch(new URL(`./packs/${niveau}.json`, import.meta.url));
  if (!reponse.ok) throw new Error(`Pack ${niveau} introuvable (${reponse.status})`);
  const contenu: unknown = await reponse.json();
  if (!estPackTectonic(contenu) || contenu.niveau !== niveau) throw new Error(`Pack ${niveau} invalide ou d'une autre version`);
  return convertirPack(contenu);
}
