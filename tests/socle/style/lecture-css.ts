// Aide des tests des styles : lecture des variables de couleur d'une feuille CSS et
// calcul des contrastes (formule WCAG 2). Lecteur volontairement limité à ce que les feuilles du
// projet écrivent : un bloc `<sélecteur> { --nom: valeur; … }`, des couleurs #rgb / #rrggbb,
// light-dark(<clair>, <sombre>) et var(--autre).

import { readFileSync } from 'node:fs';

export type Variables = ReadonlyMap<string, string>;

/** Déclarations `--nom: valeur;` du premier bloc dont le sélecteur est exactement `selecteur`. */
export function lireBloc(fichier: string, selecteur: string): Variables {
  const texte = readFileSync(fichier, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const debut = texte.indexOf(`${selecteur} {`);
  if (debut < 0) throw new Error(`${fichier} : bloc « ${selecteur} » introuvable`);
  const fin = texte.indexOf('}', debut);
  const corps = texte.slice(texte.indexOf('{', debut) + 1, fin);
  const variables = new Map<string, string>();
  for (const m of corps.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const [, nom, valeur] = m;
    if (nom !== undefined && valeur !== undefined) variables.set(nom, valeur.trim());
  }
  return variables;
}

/** Sépare les arguments d'une fonction CSS au premier niveau de parenthèses. */
function arguments_(texte: string): string[] {
  const resultat: string[] = [];
  let profondeur = 0;
  let courant = '';
  for (const c of texte) {
    if (c === '(') profondeur++;
    if (c === ')') profondeur--;
    if (c === ',' && profondeur === 0) {
      resultat.push(courant.trim());
      courant = '';
    } else courant += c;
  }
  resultat.push(courant.trim());
  return resultat;
}

export type Mode = 'clair' | 'sombre';

/**
 * Valeur d'une variable dans un mode, var() résolues (d'abord dans `variables`, puis dans `base` :
 * un style ne redéfinit pas forcément tout).
 */
export function resoudre(nom: string, mode: Mode, variables: Variables, base: Variables, profondeur = 0): string {
  if (profondeur > 10) throw new Error(`boucle de var() sur ${nom}`);
  const brut = variables.get(nom) ?? base.get(nom);
  if (brut === undefined) throw new Error(`variable ${nom} absente`);
  let valeur = brut;
  const ld = /^light-dark\((.*)\)$/s.exec(valeur);
  if (ld !== null) {
    const [clair, sombre] = arguments_(ld[1] ?? '');
    valeur = (mode === 'clair' ? clair : sombre) ?? '';
  }
  const v = /^var\((--[a-z0-9-]+)\)$/.exec(valeur);
  if (v !== null && v[1] !== undefined) return resoudre(v[1], mode, variables, base, profondeur + 1);
  return valeur;
}

/** #rgb ou #rrggbb → [r, g, b] (0-255) ; null pour toute autre écriture. */
export function rvb(couleur: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(couleur);
  if (m === null || m[1] === undefined) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Rapport de contraste WCAG entre deux couleurs opaques (1 à 21). */
export function contraste(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}
