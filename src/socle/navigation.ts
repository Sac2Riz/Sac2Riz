// NAVIGATION entre les écrans (étape 6a). Code pur, testé sous Node.
//
// Chaque écran a un PARENT, celui où ramènent le bouton « ← » et le bouton retour d'Android :
//   accueil
//   ├─ fiche d'un jeu
//   │  ├─ partie        (et la fin de partie, qui la remplace)
//   │  └─ statistiques de ce jeu
//   └─ statistiques de tous les jeux
// La PROFONDEUR d'un écran (0 pour l'accueil) est le nombre d'entrées que l'appli a ajoutées à
// l'historique du navigateur pour y arriver (app.ts) : « retour » en retire une et remonte d'un cran.

export type Ecran =
  | { readonly type: 'accueil' }
  | { readonly type: 'fiche'; readonly jeu: string }
  | { readonly type: 'partie'; readonly jeu: string }
  | { readonly type: 'fin'; readonly jeu: string }
  /** jeu = null : statistiques de tous les jeux (depuis l'accueil). */
  | { readonly type: 'stats'; readonly jeu: string | null };

export const ACCUEIL: Ecran = { type: 'accueil' };

/** Écran où ramène « retour », ou null pour l'accueil. */
export function parent(ecran: Ecran): Ecran | null {
  switch (ecran.type) {
    case 'accueil':
      return null;
    case 'fiche':
      return ACCUEIL;
    case 'partie':
    case 'fin':
      return { type: 'fiche', jeu: ecran.jeu };
    case 'stats':
      return ecran.jeu === null ? ACCUEIL : { type: 'fiche', jeu: ecran.jeu };
  }
}

/** Nombre de crans depuis l'accueil. */
export function profondeur(ecran: Ecran): number {
  const p = parent(ecran);
  return p === null ? 0 : 1 + profondeur(p);
}

/** Ancêtre de l'écran à la profondeur demandée (l'écran lui-même s'il n'est pas plus profond). */
export function ancetre(ecran: Ecran, cible: number): Ecran {
  let courant = ecran;
  while (profondeur(courant) > Math.max(0, cible)) courant = parent(courant) ?? ACCUEIL;
  return courant;
}

/**
 * Comment passer de l'écran courant à un nouvel écran dans l'historique du navigateur :
 * un cran plus bas → ajouter une entrée ; même profondeur (fin de partie, partie suivante) →
 * remplacer l'entrée. Remonter ne passe pas par ici : c'est toujours un « retour » (history.back).
 */
export function changementHistorique(depuis: Ecran, vers: Ecran): 'ajouter' | 'remplacer' {
  return profondeur(vers) > profondeur(depuis) ? 'ajouter' : 'remplacer';
}

/** Même écran (même type, même jeu). */
export function memeEcran(a: Ecran, b: Ecran): boolean {
  return a.type === b.type && ('jeu' in a ? a.jeu : null) === ('jeu' in b ? b.jeu : null);
}
