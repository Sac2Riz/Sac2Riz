// ANNONCE D'UNE NOUVELLE VERSION : le bouton « Mettre à jour », affiché à côté du bouton Réglages
// (accueil, fiche d'un jeu, partie) UNIQUEMENT quand une nouvelle version est prête. Chaque écran
// en crée un (bouton()) ; tous apparaissent dès que proposer() est appelé (mise-a-jour.ts), y
// compris sur l'écran déjà affiché. Le toucher ouvre la fenêtre de confirmation
// (fenetre-mise-a-jour.ts) : rien ne change sans le feu vert du joueur.

import { bouton, creer } from '../dom.ts';
import { ouvrirFenetreMiseAJour } from './fenetre-mise-a-jour.ts';
import type { InfosMiseAJour } from './infos-mise-a-jour.ts';

export type AnnonceMiseAJour = {
  /** Une nouvelle version est prête ; appliquer() passe à elle (après sauvegarde). */
  readonly proposer: (appliquer: () => Promise<void>) => void;
  /** Nouveau bouton « Mettre à jour » pour un écran (masqué tant qu'aucune version n'est prête). */
  readonly bouton: () => HTMLButtonElement;
};

export function creerAnnonceMiseAJour(lireInfos: () => Promise<InfosMiseAJour>): AnnonceMiseAJour {
  let appliquer: (() => Promise<void>) | null = null;
  /**
   * Boutons créés, en références faibles : un bouton d'un écran quitté est libéré par le navigateur
   * (et un bouton créé mais pas encore placé dans la page n'est jamais oublié).
   */
  let boutons: WeakRef<HTMLButtonElement>[] = [];
  let fenetreOuverte = false;

  async function ouvrir(): Promise<void> {
    if (appliquer === null || fenetreOuverte) return;
    fenetreOuverte = true;
    try {
      await ouvrirFenetreMiseAJour(lireInfos(), appliquer);
    } finally {
      fenetreOuverte = false;
    }
  }

  return {
    proposer(nouvelle) {
      appliquer = nouvelle;
      boutons = boutons.filter((r) => r.deref() !== undefined);
      for (const r of boutons) {
        const b = r.deref();
        if (b !== undefined) b.hidden = false;
      }
    },
    bouton() {
      const b = bouton('bouton bouton-menu bouton-maj', '', () => void ouvrir());
      b.append(creer('span', 'bouton-maj-point'), creer('span', 'icone', '⟳'), creer('span', 'bouton-maj-libelle', 'Mettre à jour'));
      b.title = 'Une nouvelle version est prête : mettre à jour';
      b.setAttribute('aria-label', 'Mettre à jour : une nouvelle version est prête');
      b.hidden = appliquer === null;
      boutons = [...boutons.filter((r) => r.deref() !== undefined), new WeakRef(b)];
      return b;
    },
  };
}
