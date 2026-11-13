// ÉCRAN DE FIN DE PARTIE : temps, niveau, force, technique la plus difficile, indices utilisés
// et record éventuel (voir bilan-fin.ts). Boutons « Nouvelle partie » (même jeu, même niveau)
// et « Accueil » ; le bouton retour d'Android ramène aussi à l'accueil (géré par app.ts).

import { bouton, creer } from './dom.ts';
import { lignesBilan, messageRecord, type BilanFin } from './bilan-fin.ts';

export type ActionsFin = {
  readonly nouvelle: () => void;
  readonly accueil: () => void;
};

export function afficherFin(conteneur: HTMLElement, bilan: BilanFin, actions: ActionsFin): void {
  const ecran = creer('div', 'ecran-fin');
  const carte = creer('section', 'fin-carte');
  carte.setAttribute('aria-labelledby', 'fin-titre');
  const titre = creer('h1', 'fin-titre', 'Bravo !');
  titre.id = 'fin-titre';
  carte.append(titre, creer('p', 'fin-sous-titre', 'Grille terminée'));

  const liste = creer('dl', 'fin-bilan');
  for (const { libelle, valeur } of lignesBilan(bilan)) {
    const ligne = creer('div', 'fin-ligne');
    ligne.append(creer('dt', '', libelle), creer('dd', '', valeur));
    liste.append(ligne);
  }
  carte.append(liste);

  const message = messageRecord(bilan);
  if (message !== '') {
    const record = creer('p', `fin-record${bilan.nouveauRecord ? ' est-record' : ''}`, `${bilan.nouveauRecord ? '🏆 ' : ''}${message}`);
    carte.append(record);
  }

  const boutons = creer('div', 'fin-boutons');
  const nouvelle = bouton('bouton bouton-principal', 'Nouvelle partie', actions.nouvelle);
  boutons.append(bouton('bouton bouton-secondaire', 'Accueil', actions.accueil), nouvelle);
  carte.append(boutons);
  ecran.append(carte);
  conteneur.replaceChildren(ecran);
  nouvelle.focus();
}
