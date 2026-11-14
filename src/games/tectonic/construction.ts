// CONSTRUCTION d'une grille pleine de Tectonic : les zones ET les chiffres en même temps. Code pur.
//
// Pourquoi pas « découper au hasard, puis remplir » : deux 1 ne se touchent jamais (même en diagonale),
// une grille 9 × 9 contient donc au plus 25 chiffres 1, soit au plus 25 zones. Un découpage tiré au
// hasard laisse trop de petites zones : mesuré à l'étape 7a, moins de 1 % des découpages 9 × 9 se
// remplissent. Construire les deux ensemble réussit environ une fois sur trois.
//
// Méthode : les cases sont remplies dans l'ordre de lecture, avec retour en arrière (limité en nœuds).
// Pour chaque case, on choisit sa zone (celle de la case de gauche, celle du dessus, les deux réunies,
// ou une nouvelle zone) et son chiffre (différent des cases déjà remplies qu'elle touche et des chiffres
// de sa zone, zone de taille ≤ tailleMax). Une zone qui ne peut plus grandir (plus aucune case libre à
// côté d'elle) doit contenir exactement 1 à N. Chaque nouvelle zone reçoit une taille visée tirée au
// hasard (poids) : une fois atteinte, la faire grandir encore n'est essayé qu'en dernier, ce qui varie
// un peu les tailles. Le plus petit chiffre qui manque à la zone est proposé d'abord (le plus souvent).
// Les tableaux de travail sont locaux ; aucun argument n'est modifié.

import type { Alea } from '../../types/alea.ts';
import { numeroterZones } from './geometrie.ts';

export type ParametresConstruction = {
  readonly lignes: number;
  readonly colonnes: number;
  /** Taille maximale d'une zone (5, ou 6 en option). */
  readonly tailleMax: number;
  /** Poids du tirage de la taille visée : poids[i] pour i + 1 cases (tailleMax valeurs). */
  readonly poids: readonly number[];
  /** Probabilité d'essayer d'abord une nouvelle zone plutôt que de prolonger une voisine. */
  readonly probaNouvelle: number;
  /**
   * Probabilité de proposer d'abord à la zone le plus petit chiffre qui lui manque (sinon : ordre au
   * hasard). Mesuré à l'étape 7a : 0,8 divise par deux environ le coût d'une grille pleine 8 × 8 ou 9 × 9.
   */
  readonly probaManquant: number;
  /** Nombre maximal de zones d'une seule case (chiffre « gratuit »). */
  readonly unitairesMax: number;
  /** Garde-fou du retour en arrière : au-delà, la tentative échoue (en recommencer une). */
  readonly noeudsMax: number;
};

export type GrillePleine = {
  /** Carte des zones, numérotée dans l'ordre de lecture. */
  readonly zones: number[];
  readonly solution: number[];
};

/** Zones auxquelles la case peut se joindre (0, 1 ou 2 zones). */
type Choix = readonly number[];

function tirerTaille(poids: readonly number[], alea: Alea): number {
  const total = poids.reduce((s, p) => s + p, 0);
  let tirage = alea.suivant() * total;
  for (let i = 0; i < poids.length; i++) {
    tirage -= poids[i] ?? 0;
    if (tirage < 0) return i + 1;
  }
  return poids.length;
}

/** Une tentative de construction ; null si elle échoue (limite de nœuds, ou impasse). */
export function construireGrille(p: ParametresConstruction, alea: Alea): GrillePleine | null {
  const { lignes: L, colonnes: C, tailleMax, unitairesMax, noeudsMax } = p;
  const N = L * C;
  const zone = new Int32Array(N).fill(-1);
  const valeur = new Int32Array(N);
  // Par zone (indice = numéro provisoire) : taille, masque des chiffres, taille visée
  const taille: number[] = [];
  const masque: number[] = [];
  const visee: number[] = [];
  let unitaires = 0;
  let noeuds = 0;

  /** Vrai si la zone a encore une case libre à côté d'elle, une fois la case i remplie. */
  function ouverte(z: number, i: number): boolean {
    for (let j = Math.max(0, i - C + 1); j <= i; j++) {
      if (zone[j] !== z) continue;
      if (j + C < N) return true; // case libre en dessous
      if (j === i && (i % C) + 1 < C) return true; // case libre à droite
    }
    return false;
  }

  /** Une zone fermée doit contenir exactement 1 à N. */
  const complete = (z: number): boolean => masque[z] === (1 << (taille[z] ?? 0)) - 1;

  /** Chiffres interdits en i : ceux des cases déjà remplies qui la touchent (gauche, haut-gauche, haut, haut-droite). */
  function interdits(i: number): number {
    const l = Math.floor(i / C);
    const c = i % C;
    let m = 0;
    if (c > 0) m |= 1 << ((valeur[i - 1] ?? 1) - 1);
    if (l > 0) {
      m |= 1 << ((valeur[i - C] ?? 1) - 1);
      if (c > 0) m |= 1 << ((valeur[i - C - 1] ?? 1) - 1);
      if (c + 1 < C) m |= 1 << ((valeur[i - C + 1] ?? 1) - 1);
    }
    return m;
  }

  /** Ordre des choix de zone : prolonger une zone (sans dépasser sa taille visée) ou en créer une, puis le reste. */
  function choix(i: number): Choix[] {
    const l = Math.floor(i / C);
    const c = i % C;
    const gauche = c > 0 ? (zone[i - 1] ?? -1) : -1;
    const haut = l > 0 ? (zone[i - C] ?? -1) : -1;
    const prolonger: Choix[] = [];
    if (gauche >= 0) prolonger.push([gauche]);
    if (haut >= 0 && haut !== gauche) prolonger.push([haut]);
    if (gauche >= 0 && haut >= 0 && haut !== gauche) prolonger.push([gauche, haut]);
    const pleine = (ch: Choix): boolean => ch.some((z) => (taille[z] ?? 0) >= (visee[z] ?? 0));
    const melange = alea.melanger(prolonger);
    const libres = melange.filter((ch) => !pleine(ch));
    const nouvelle: Choix = [];
    const debut = alea.suivant() < p.probaNouvelle || libres.length === 0 ? [nouvelle, ...libres] : [...libres, nouvelle];
    return [...debut, ...melange.filter(pleine)];
  }

  /**
   * Ordre d'essai des chiffres : le plus petit chiffre qui manque à la zone d'abord (avec la probabilité
   * probaManquant), pour qu'elle contienne 1 à N si elle se ferme bientôt ; les autres au hasard.
   */
  function ordreChiffres(chiffres: number): number[] {
    const tous = alea.melanger(Array.from({ length: tailleMax }, (_, k) => k + 1));
    const manquant = 32 - Math.clz32(~chiffres & (chiffres + 1));
    if (alea.suivant() >= p.probaManquant) return tous;
    return [manquant, ...tous.filter((v) => v !== manquant)];
  }

  function remplir(i: number): boolean {
    if (i === N) {
      for (let z = 0; z < taille.length; z++) if ((taille[z] ?? 0) > 0 && !complete(z)) return false;
      return true;
    }
    if (++noeuds > noeudsMax) return false;
    const l = Math.floor(i / C);
    const c = i % C;
    const interdit = interdits(i);
    for (const ch of choix(i)) {
      // Taille et chiffres de la zone obtenue (deux zones réunies : chiffres forcément différents)
      let nouvelleTaille = 1;
      let chiffres = 0;
      let compatibles = true;
      for (const z of ch) {
        nouvelleTaille += taille[z] ?? 0;
        if ((chiffres & (masque[z] ?? 0)) !== 0) compatibles = false;
        chiffres |= masque[z] ?? 0;
      }
      if (!compatibles || nouvelleTaille > tailleMax) continue;
      const tailleVisee = ch.length === 0 ? tirerTaille(p.poids, alea) : 0;

      for (const v of ordreChiffres(chiffres)) {
        const bit = 1 << (v - 1);
        if ((interdit & bit) !== 0 || (chiffres & bit) !== 0) continue;

        // --- Appliquer ---
        let z: number;
        let absorbee = -1;
        const deplacees: number[] = [];
        let avant: readonly [number, number, number, number] = [0, 0, 0, 0];
        let viseeAvant = 0;
        if (ch.length === 0) {
          z = taille.length;
          taille.push(0);
          masque.push(0);
          visee.push(tailleVisee);
        } else {
          z = ch[0] ?? 0;
          if (ch.length === 2) {
            absorbee = ch[1] ?? 0;
            avant = [taille[z] ?? 0, masque[z] ?? 0, taille[absorbee] ?? 0, masque[absorbee] ?? 0];
            for (let j = 0; j < i; j++) {
              if (zone[j] === absorbee) {
                zone[j] = z;
                deplacees.push(j);
              }
            }
            viseeAvant = visee[z] ?? 0;
            taille[z] = avant[0] + avant[2];
            masque[z] = avant[1] | avant[3];
            visee[z] = Math.max(visee[z] ?? 0, visee[absorbee] ?? 0);
            taille[absorbee] = 0;
            masque[absorbee] = 0;
          }
        }
        zone[i] = z;
        valeur[i] = v;
        taille[z] = (taille[z] ?? 0) + 1;
        masque[z] = (masque[z] ?? 0) | bit;

        // Zones qui ne peuvent plus grandir après cette case : celle du dessus (qui n'a plus de case
        // libre en dessous) et, sur la dernière ligne, celle de gauche
        let valide = true;
        let nouveauxUnitaires = 0;
        const aVerifier = new Set<number>();
        if (l > 0) aVerifier.add(zone[i - C] ?? -1);
        if (l === L - 1 && c > 0) aVerifier.add(zone[i - 1] ?? -1);
        for (const zz of aVerifier) {
          if (ouverte(zz, i)) continue;
          if (!complete(zz)) {
            valide = false;
            break;
          }
          if (taille[zz] === 1) nouveauxUnitaires++;
        }
        if (valide && unitaires + nouveauxUnitaires <= unitairesMax) {
          unitaires += nouveauxUnitaires;
          if (remplir(i + 1)) return true;
          unitaires -= nouveauxUnitaires;
        }

        // --- Défaire ---
        taille[z] = (taille[z] ?? 1) - 1;
        masque[z] = (masque[z] ?? 0) & ~bit;
        zone[i] = -1;
        valeur[i] = 0;
        if (ch.length === 0) {
          taille.pop();
          masque.pop();
          visee.pop();
        } else if (absorbee >= 0) {
          for (const j of deplacees) zone[j] = absorbee;
          [taille[z], masque[z], taille[absorbee], masque[absorbee]] = avant;
          visee[z] = viseeAvant;
        }
        if (noeuds > noeudsMax) return false;
      }
    }
    return false;
  }

  if (!remplir(0)) return null;
  // Dernière ligne : les zones fermées à la toute fin n'ont pas été comptées ; vérifier les zones d'une case
  const zones = numeroterZones(Array.from(zone));
  const tailles = new Map<number, number>();
  for (const z of zones) tailles.set(z, (tailles.get(z) ?? 0) + 1);
  if ([...tailles.values()].filter((t) => t === 1).length > unitairesMax) return null;
  return { zones, solution: Array.from(valeur) };
}
