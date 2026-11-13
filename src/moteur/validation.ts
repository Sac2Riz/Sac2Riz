// Contrôle d'une grille (partielle ou complète) par rapport aux règles de sa définition.
// Servira à erreurs() et estTerminee() des jeux. Code pur.

import type { Cellule, DefinitionGrille, ValeursGrille } from '../types/grille.ts';

function verifierTaille(definition: DefinitionGrille, valeurs: ValeursGrille): void {
  const attendu = definition.lignes * definition.colonnes;
  if (valeurs.length !== attendu) {
    throw new Error(`Grille de ${valeurs.length} cases au lieu de ${attendu}`);
  }
}

/**
 * Cases en conflit, triées par ordre croissant :
 * - valeur non autorisée ;
 * - valeur répétée dans une région d'unicité ou dans une cage « distinctes » ;
 * - cage dont la somme dépasse le total, ou cage pleine dont la somme diffère du total.
 * Les cases vides (0) ne sont jamais en conflit.
 */
export function conflits(definition: DefinitionGrille, valeurs: ValeursGrille): Cellule[] {
  verifierTaille(definition, valeurs);
  const enConflit = new Set<Cellule>();
  const autorisees = new Set(definition.valeurs);

  valeurs.forEach((v, c) => {
    if (v !== 0 && !autorisees.has(v)) enConflit.add(c);
  });

  for (const region of definition.regions) {
    const remplies = region.cellules.filter((c) => (valeurs[c] ?? 0) !== 0);
    const distinctes = region.type === 'unicite' || region.distinctes;
    if (distinctes) {
      const parValeur = new Map<number, Cellule[]>();
      for (const c of remplies) {
        const v = valeurs[c] ?? 0;
        parValeur.set(v, [...(parValeur.get(v) ?? []), c]);
      }
      for (const cellules of parValeur.values()) {
        if (cellules.length > 1) cellules.forEach((c) => enConflit.add(c));
      }
    }
    if (region.type === 'somme') {
      const somme = remplies.reduce((s, c) => s + (valeurs[c] ?? 0), 0);
      const pleine = remplies.length === region.cellules.length;
      if (somme > region.total || (pleine && somme !== region.total)) {
        remplies.forEach((c) => enConflit.add(c));
      }
    }
  }
  return [...enConflit].sort((a, b) => a - b);
}

/** Vrai si aucune case n'est vide. */
export function estComplete(definition: DefinitionGrille, valeurs: ValeursGrille): boolean {
  verifierTaille(definition, valeurs);
  return valeurs.every((v) => v !== 0);
}

/** Vrai si la grille est complète et respecte toutes les règles. */
export function estSolution(definition: DefinitionGrille, valeurs: ValeursGrille): boolean {
  return estComplete(definition, valeurs) && conflits(definition, valeurs).length === 0;
}
