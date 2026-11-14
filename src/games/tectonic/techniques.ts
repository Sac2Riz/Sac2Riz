// TECHNIQUES du Tectonic, dans l'ordre où le solveur les essaie (de la plus simple à la plus dure).
// Toutes viennent du moteur : techniques du sudoku valables ici (elles ne connaissent que les régions
// et la relation « se voient ») et techniques complémentaires de l'étape 7a. Absentes : pointing et
// claiming (englobés par la voisine commune), et les motifs fondés sur les lignes et les colonnes
// (Skyscraper, 2-String Kite, X-Wing, Swordfish), sans objet ici. Voir docs/DIFFICULTE.md. Code pur.

import type { Technique } from '../../moteur/logique/technique.ts';
import { dernierChiffre } from '../../moteur/logique/techniques/dernier-chiffre.ts';
import { forcingSimple } from '../../moteur/logique/techniques/forcing-simple.ts';
import { paireCachee } from '../../moteur/logique/techniques/paire-cachee.ts';
import { paireNueEtendue } from '../../moteur/logique/techniques/paire-nue-etendue.ts';
import { paireNue } from '../../moteur/logique/techniques/paire-nue.ts';
import { quadrupletCache } from '../../moteur/logique/techniques/quadruplet-cache.ts';
import { quadrupletNu } from '../../moteur/logique/techniques/quadruplet-nu.ts';
import { singletonCacheZone } from '../../moteur/logique/techniques/singleton-cache-zone.ts';
import { singletonNu } from '../../moteur/logique/techniques/singleton-nu.ts';
import { tripletCache } from '../../moteur/logique/techniques/triplet-cache.ts';
import { tripletNu } from '../../moteur/logique/techniques/triplet-nu.ts';
import { voisineCommuneEtendue } from '../../moteur/logique/techniques/voisine-commune-etendue.ts';
import { voisineCommune } from '../../moteur/logique/techniques/voisine-commune.ts';
import { xChain } from '../../moteur/logique/techniques/x-chain.ts';
import { xyChain } from '../../moteur/logique/techniques/xy-chain.ts';
import { xyzWing } from '../../moteur/logique/techniques/xyz-wing.ts';
import { yWing } from '../../moteur/logique/techniques/y-wing.ts';
import type { IdTechnique } from '../../types/logique.ts';

export const TECHNIQUES_TECTONIC: readonly Technique[] = [
  // Débutant
  dernierChiffre,
  singletonCacheZone,
  // Facile
  singletonNu,
  voisineCommune,
  // Moyen
  paireNue,
  paireCachee,
  voisineCommuneEtendue,
  paireNueEtendue,
  // Difficile
  tripletNu,
  tripletCache,
  quadrupletNu,
  quadrupletCache,
  // Expert
  yWing,
  xyzWing,
  // Diabolique
  xChain,
  xyChain,
  forcingSimple,
];

/** Identifiants dans l'ordre d'essai (sert à désigner la technique la plus dure d'une notation). */
export const IDS_TECHNIQUES_TECTONIC: readonly IdTechnique[] = TECHNIQUES_TECTONIC.map((t) => t.id);

const NOMS: ReadonlyMap<string, string> = new Map(TECHNIQUES_TECTONIC.map((t) => [t.id, t.nom]));

/** Nom affiché d'une technique (écran de fin, titre d'un indice). */
export function nomTechnique(id: string): string {
  return NOMS.get(id) ?? id;
}
