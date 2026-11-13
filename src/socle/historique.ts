// HISTORIQUE D'UNE PARTIE (annuler / rétablir illimités). Code pur, générique (tout type d'action).
//
// Une partie = la liste de TOUTES les actions jouées + un curseur = nombre d'actions appliquées.
//   actions : [a1, a2, a3, a4]   curseur : 2   → état = etatInitial puis a1, a2
//   annuler  → curseur 1 ; rétablir → curseur 3 ;
//   jouer a5 → les actions après le curseur (a3, a4) sont effacées : [a1, a2, a5], curseur 3.
// L'état n'est jamais stocké : il se recalcule en rejouant les actions (etatCourant). C'est le
// format de PartieSauvegardee (actions + curseur).

export type Historique<A> = {
  readonly actions: readonly A[];
  readonly curseur: number;
};

export function historiqueVide<A>(): Historique<A> {
  return { actions: [], curseur: 0 };
}

/** Ajoute une action après le curseur (les actions annulées sont oubliées). */
export function jouer<A>(historique: Historique<A>, action: A): Historique<A> {
  const actions = [...historique.actions.slice(0, historique.curseur), action];
  return { actions, curseur: actions.length };
}

export function peutAnnuler<A>(historique: Historique<A>): boolean {
  return historique.curseur > 0;
}

export function peutRetablir<A>(historique: Historique<A>): boolean {
  return historique.curseur < historique.actions.length;
}

/** Recule d'une action (sans effet s'il n'y a rien à annuler). */
export function annuler<A>(historique: Historique<A>): Historique<A> {
  return peutAnnuler(historique) ? { actions: historique.actions, curseur: historique.curseur - 1 } : historique;
}

/** Réapplique la dernière action annulée (sans effet s'il n'y en a pas). */
export function retablir<A>(historique: Historique<A>): Historique<A> {
  return peutRetablir(historique) ? { actions: historique.actions, curseur: historique.curseur + 1 } : historique;
}

/** Actions actuellement appliquées (avant le curseur). */
export function actionsAppliquees<A>(historique: Historique<A>): readonly A[] {
  return historique.actions.slice(0, historique.curseur);
}

/** État obtenu en appliquant à l'état initial les actions avant le curseur. */
export function etatCourant<E, A>(historique: Historique<A>, etatInitial: E, appliquer: (etat: E, action: A) => E): E {
  return actionsAppliquees(historique).reduce(appliquer, etatInitial);
}

/** Vrai si le curseur est cohérent (utile pour relire une sauvegarde). */
export function estHistoriqueValide<A>(historique: Historique<A>): boolean {
  return Number.isInteger(historique.curseur) && historique.curseur >= 0 && historique.curseur <= historique.actions.length;
}
