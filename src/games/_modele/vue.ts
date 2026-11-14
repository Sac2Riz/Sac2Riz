// VUE du jeu : implémente VueJeu (src/types/vue.ts). Seul fichier du jeu qui touche au DOM.
// Elle ne modifie jamais l'état elle-même : elle appelle contexte.jouer(action)
// et le socle la rappelle ensuite via afficher().

import { chargerFeuilleDeStyle } from '../../socle/styles.ts';
import type { ContexteVue, InstanceVue, VueJeu, ZonesVue } from '../../types/vue.ts';
import { TAILLE, type ActionModele, type DonneesModele, type EtatModele } from './types.ts';

function monter({ grille: conteneur }: ZonesVue, contexte: ContexteVue<ActionModele>): InstanceVue<DonneesModele, EtatModele> {
  chargerFeuilleDeStyle(new URL('./style.css', import.meta.url));

  let selection: number | null = null;

  const ligne = document.createElement('div');
  ligne.className = 'modele-ligne';
  const cases: HTMLButtonElement[] = [];
  for (let i = 0; i < TAILLE; i++) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'modele-case';
    bouton.addEventListener('click', () => {
      selection = i;
      for (const [j, c] of cases.entries()) c.classList.toggle('est-selectionnee', j === i);
    });
    cases.push(bouton);
  }
  ligne.append(...cases);
  conteneur.append(ligne);

  return {
    afficher({ etat, donnees, erreurs, indice }) {
      cases.forEach((bouton, i) => {
        const valeur = etat.valeurs[i] ?? 0;
        const notes = etat.notes[i] ?? [];
        bouton.textContent = valeur !== 0 ? String(valeur) : notes.join(' ');
        bouton.classList.toggle('est-donnee', (donnees.donnes[i] ?? 0) !== 0);
        bouton.classList.toggle('est-note', valeur === 0 && notes.length > 0);
        bouton.classList.toggle('est-erreur', erreurs.includes(i));
        bouton.classList.toggle('est-indice', indice !== null && indice.cellules.includes(i));
      });
    },
    saisir(texte) {
      const valeur = Number(texte);
      if (selection === null || !Number.isInteger(valeur)) return;
      contexte.jouer({ type: contexte.modeNotes() ? 'noter' : 'placer', cellule: selection, valeur });
    },
    effacer() {
      if (selection !== null) contexte.jouer({ type: 'effacer', cellule: selection });
    },
    detruire() {
      ligne.remove();
    },
  };
}

export const vue: VueJeu<DonneesModele, EtatModele, ActionModele> = {
  // Pavé commun du socle avec les chiffres 1 à TAILLE
  pave: { type: 'commun', valeurs: Array.from({ length: TAILLE }, (_, i) => String(i + 1)) },
  // Outils du socle à masquer (ex. ['notes'] pour un jeu sans notes)
  outilsMasques: [],
  monter,
  // Chaque chiffre ne se place qu'une fois : il reste 1 s'il n'est pas encore dans la ligne
  restants: (etat) =>
    Object.fromEntries(Array.from({ length: TAILLE }, (_, i) => [String(i + 1), etat.valeurs.includes(i + 1) ? 0 : 1])),
};
