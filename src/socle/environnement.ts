// Petites dépendances « d'environnement » injectées dans les services (minuteur, journal).
// Les services les reçoivent en paramètre au lieu d'appeler setTimeout ou console directement :
// les tests peuvent ainsi fournir une horloge factice qu'ils font avancer à volonté.

/** Fonction qui annule ce qui a été programmé. */
export type Annulation = () => void;

/** Programme l'appel de « rappel » dans delaiMs millisecondes. */
export type Programmer = (rappel: () => void, delaiMs: number) => Annulation;

/** Écrit un message de diagnostic (console du navigateur en production). */
export type Journal = (message: string) => void;

/** Programmation réelle, avec setTimeout. */
export const programmerReel: Programmer = (rappel, delaiMs) => {
  const minuterie = setTimeout(rappel, delaiMs);
  return () => clearTimeout(minuterie);
};

export const journalConsole: Journal = (message) => console.info(`[Sac2Riz] ${message}`);
