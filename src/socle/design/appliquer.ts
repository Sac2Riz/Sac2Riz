// Application de la direction de design à la page (étape 6b, TEMPORAIRE : voir directions.ts).

import { mettreAJourCouleurBarre } from '../theme.ts';
import { attributDirection, ecrireDirection, lireDirection, type Direction, type StockageLocal } from './directions.ts';

/** Stockage local du navigateur, ou null s'il est inaccessible (son simple accès peut lever une erreur). */
function stockageLocal(): StockageLocal | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Écouteurs d'un changement de direction (décors animés). */
const ecouteurs = new Set<(d: Direction) => void>();

let courante: Direction = lireDirection(stockageLocal());

export function directionCourante(): Direction {
  return courante;
}

export function suivreDirection(ecouteur: (d: Direction) => void): void {
  ecouteurs.add(ecouteur);
}

/** Pose l'attribut data-direction et met à jour la couleur de la barre d'état. */
function poser(direction: Direction): void {
  const racine = document.documentElement;
  const valeur = attributDirection(direction);
  if (valeur === null) delete racine.dataset['direction'];
  else racine.dataset['direction'] = valeur;
  mettreAJourCouleurBarre();
}

/** Au démarrage : direction enregistrée. */
export function appliquerDirectionEnregistree(): void {
  poser(courante);
}

/** Choix dans les réglages : appliqué tout de suite et enregistré. */
export function changerDirection(direction: Direction): void {
  courante = direction;
  ecrireDirection(stockageLocal(), direction);
  poser(direction);
  for (const e of ecouteurs) e(direction);
}
