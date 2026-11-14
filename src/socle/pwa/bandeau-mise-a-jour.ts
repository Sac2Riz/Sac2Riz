// BANDEAU « Nouvelle version disponible » : discret, en bas de l'écran, par-dessus l'appli sans
// la bloquer. « Recharger » passe à la nouvelle version (la partie en cours est sauvegardée
// d'abord) ; « Plus tard » le masque jusqu'au prochain lancement de l'appli.

import { bouton, creer } from '../dom.ts';

export function afficherBandeauMiseAJour(appliquer: () => Promise<void>): void {
  if (document.querySelector('.bandeau-maj') !== null) return;
  const bandeau = creer('div', 'bandeau-maj');
  bandeau.setAttribute('role', 'status');
  const texte = creer('span', 'bandeau-maj-texte', 'Nouvelle version disponible');
  const plusTard = bouton('bouton bouton-secondaire bandeau-maj-bouton', 'Plus tard', () => bandeau.remove());
  const recharger = bouton('bouton bouton-principal bandeau-maj-bouton', 'Recharger', () => {
    recharger.disabled = true;
    plusTard.disabled = true;
    texte.textContent = 'Mise à jour…';
    appliquer().catch((erreur: unknown) => {
      console.error('Mise à jour impossible :', erreur);
      texte.textContent = 'Mise à jour impossible pour le moment';
      plusTard.disabled = false;
    });
  });
  bandeau.append(texte, plusTard, recharger);
  document.body.append(bandeau);
}
