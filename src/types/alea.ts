// Générateur de nombres pseudo-aléatoires utilisé par les générateurs de grilles.
// Il est « à graine » : la même graine donne toujours la même suite, donc la même
// grille. Indispensable pour des tests reproductibles. Implémentation : src/utils/alea.ts.

export interface Alea {
  /** Nombre décimal dans [0, 1[. */
  suivant(): number;
  /** Entier dans [0, max[. */
  entier(max: number): number;
  /** Copie mélangée du tableau (le tableau d'origine n'est pas modifié). */
  melanger<T>(tableau: readonly T[]): T[];
}
