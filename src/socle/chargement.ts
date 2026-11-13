// Indicateur de chargement plein écran (préparation d'une grille), avec un bouton Annuler.
// Il n'apparaît qu'après un court délai (CSS) : une grille prise dans la réserve, servie
// instantanément, ne provoque pas de clignotement.

import { bouton, creer } from './dom.ts';

export type Chargement = { readonly fermer: () => void };

export function afficherChargement(texte: string, annuler: () => void): Chargement {
  const voile = creer('div', 'chargement');
  voile.setAttribute('role', 'status');
  voile.setAttribute('aria-live', 'polite');
  const boite = creer('div', 'chargement-boite');
  const roue = creer('span', 'chargement-roue');
  roue.setAttribute('aria-hidden', 'true');
  boite.append(roue, creer('p', 'chargement-texte', texte), bouton('bouton bouton-secondaire', 'Annuler', annuler));
  voile.append(boite);
  document.body.append(voile);
  return { fermer: () => voile.remove() };
}
