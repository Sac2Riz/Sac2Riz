// Surveillance de la visibilité de l'appli (premier plan / arrière-plan), pour mettre le chrono
// en pause automatiquement. Sur Android, changer d'appli, verrouiller l'écran ou revenir à
// l'accueil déclenche l'événement « visibilitychange » du document.
// Branché sur le chrono à l'étape 3b ; la source est fournie (document dans le navigateur,
// un EventTarget factice dans les tests).

/** Partie du document utilisée ici. */
export type SourceVisibilite = Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & {
  readonly visibilityState: string;
};

export function estVisible(source: SourceVisibilite): boolean {
  return source.visibilityState === 'visible';
}

/**
 * Appelle rappel(visible) à chaque changement de visibilité.
 * Renvoie la fonction qui arrête la surveillance (à appeler en quittant la partie).
 */
export function surveillerVisibilite(source: SourceVisibilite, rappel: (visible: boolean) => void): () => void {
  const ecouteur = (): void => rappel(estVisible(source));
  source.addEventListener('visibilitychange', ecouteur);
  return () => source.removeEventListener('visibilitychange', ecouteur);
}
