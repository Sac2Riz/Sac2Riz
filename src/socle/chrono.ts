// CHRONOMÈTRE D'UNE PARTIE. Code pur : l'heure (« maintenant », en ms) est toujours passée en
// paramètre et chaque fonction renvoie un nouveau chrono.
//
// Le chrono tourne seulement si : pas de pause manuelle (bouton du joueur), appli visible
// (pause automatique quand elle passe en arrière-plan) et partie non terminée.
// Les deux pauses sont indépendantes : revenir dans l'appli ne relance pas un chrono que le
// joueur avait mis en pause lui-même.
//
// Représentation : temps déjà accumulé + instant depuis lequel il tourne (null s'il est arrêté).
// Temps affiché = cumulMs + (maintenant − depuis).

export type Chrono = {
  readonly cumulMs: number;
  /** Instant du dernier démarrage, ou null si le chrono ne tourne pas. */
  readonly depuis: number | null;
  readonly pauseManuelle: boolean;
  /** Appli en arrière-plan (pause automatique). */
  readonly masque: boolean;
  readonly termine: boolean;
};

type Drapeaux = Pick<Chrono, 'pauseManuelle' | 'masque' | 'termine'>;

/** Nouveau chrono (ou reprise d'une partie sauvegardée avec cumulMs) ; il tourne si l'appli est visible. */
export function creerChrono(maintenant: number, cumulMs = 0, visible = true): Chrono {
  return { cumulMs, depuis: visible ? maintenant : null, pauseManuelle: false, masque: !visible, termine: false };
}

/** Temps écoulé en ms (une horloge qui reculerait ne fait jamais baisser le temps). */
export function lireMs(chrono: Chrono, maintenant: number): number {
  return chrono.depuis === null ? chrono.cumulMs : chrono.cumulMs + Math.max(0, maintenant - chrono.depuis);
}

export function estEnMarche(chrono: Chrono): boolean {
  return chrono.depuis !== null;
}

/** Arrête le décompte, change les drapeaux, puis le relance si plus rien ne l'en empêche. */
function changer(chrono: Chrono, maintenant: number, drapeaux: Partial<Drapeaux>): Chrono {
  const suivant = { ...chrono, ...drapeaux };
  const tourne = !suivant.pauseManuelle && !suivant.masque && !suivant.termine;
  return { ...suivant, cumulMs: lireMs(chrono, maintenant), depuis: tourne ? maintenant : null };
}

export function mettreEnPause(chrono: Chrono, maintenant: number): Chrono {
  return changer(chrono, maintenant, { pauseManuelle: true });
}

export function reprendre(chrono: Chrono, maintenant: number): Chrono {
  return changer(chrono, maintenant, { pauseManuelle: false });
}

/** Pause automatique (appli masquée) ou fin de cette pause (appli de nouveau visible). */
export function changerVisibilite(chrono: Chrono, maintenant: number, visible: boolean): Chrono {
  return changer(chrono, maintenant, { masque: !visible });
}

/** Partie terminée : le temps est figé définitivement. */
export function terminer(chrono: Chrono, maintenant: number): Chrono {
  return changer(chrono, maintenant, { termine: true });
}
