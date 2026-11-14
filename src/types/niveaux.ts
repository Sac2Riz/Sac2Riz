// Les 6 niveaux de difficulté, communs à tous les jeux (voir docs/DIFFICULTE.md).
// Code pur : utilisable dans la page, le worker et les tests.

/** Identifiants des niveaux, du plus facile au plus difficile. */
export const NIVEAUX = ['debutant', 'facile', 'moyen', 'difficile', 'expert', 'diabolique'] as const;

export type Niveau = (typeof NIVEAUX)[number];

/** Score de force d'une grille, de 1 (très facile) à 10 (diabolique). */
export type Force = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type InfosNiveau = {
  readonly id: Niveau;
  /** Nom affiché dans l'interface. */
  readonly nom: string;
  /** Plage de force correspondant au niveau (bornes incluses), affichée avec le nom : « Moyen · Force 5-6 ». */
  readonly forceMin: Force;
  readonly forceMax: Force;
};

export const INFOS_NIVEAUX: Readonly<Record<Niveau, InfosNiveau>> = {
  debutant: { id: 'debutant', nom: 'Débutant', forceMin: 1, forceMax: 2 },
  facile: { id: 'facile', nom: 'Facile', forceMin: 3, forceMax: 4 },
  moyen: { id: 'moyen', nom: 'Moyen', forceMin: 5, forceMax: 6 },
  difficile: { id: 'difficile', nom: 'Difficile', forceMin: 7, forceMax: 8 },
  expert: { id: 'expert', nom: 'Expert', forceMin: 9, forceMax: 9 },
  diabolique: { id: 'diabolique', nom: 'Diabolique', forceMin: 10, forceMax: 10 },
};

/**
 * Résultat de la notation d'une grille.
 * - techniqueMax : identifiant de la technique la plus avancée nécessaire
 *   (ou critère principal pour les jeux qui ne sont pas des sudokus) ;
 * - details : nombre d'utilisations de chaque technique (pour le calcul de la force).
 */
export type Notation = {
  readonly niveau: Niveau;
  readonly force: Force;
  readonly techniqueMax: string;
  readonly details: { readonly [technique: string]: number };
};

/** Vrai si la valeur est un identifiant de niveau connu (utile à la validation d'un import). */
export function estNiveau(valeur: unknown): valeur is Niveau {
  return typeof valeur === 'string' && (NIVEAUX as readonly string[]).includes(valeur);
}

/** Vrai si la valeur est une force entière entre 1 et 10. */
export function estForce(valeur: unknown): valeur is Force {
  return typeof valeur === 'number' && Number.isInteger(valeur) && valeur >= 1 && valeur <= 10;
}

/** Niveau correspondant à une force donnée. */
export function niveauPourForce(force: Force): Niveau {
  for (const niveau of NIVEAUX) {
    if (force <= INFOS_NIVEAUX[niveau].forceMax) return niveau;
  }
  return 'diabolique';
}
