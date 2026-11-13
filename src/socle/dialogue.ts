// Fenêtres de dialogue (confirmation, information) avec l'élément <dialog> du navigateur :
// il bloque le reste de la page, gère la touche Échap et le focus. Le bouton « retour »
// d'Android ferme aussi la fenêtre (comme Annuler).

import { creer } from './dom.ts';

type OptionsDialogue = {
  readonly titre: string;
  readonly message: string;
  /** Libellé du bouton principal. */
  readonly ok: string;
  /** Libellé du bouton secondaire, ou null pour une simple information. */
  readonly annuler: string | null;
};

function ouvrir(options: OptionsDialogue): Promise<boolean> {
  const dialogue = creer('dialog', 'dialogue');
  // method="dialog" : un bouton du formulaire ferme la fenêtre et donne sa valeur à returnValue
  const formulaire = creer('form', 'dialogue-contenu');
  formulaire.method = 'dialog';
  const boutons = creer('div', 'dialogue-boutons');
  if (options.annuler !== null) {
    const non = creer('button', 'bouton bouton-secondaire', options.annuler);
    non.value = 'annuler';
    boutons.append(non);
  }
  const oui = creer('button', 'bouton bouton-principal', options.ok);
  oui.value = 'ok';
  boutons.append(oui);
  formulaire.append(creer('h2', 'dialogue-titre', options.titre), creer('p', 'dialogue-message', options.message), boutons);
  dialogue.append(formulaire);
  document.body.append(dialogue);

  return new Promise((resoudre) => {
    dialogue.addEventListener('close', () => {
      resoudre(dialogue.returnValue === 'ok');
      dialogue.remove();
    });
    dialogue.showModal();
    oui.focus();
  });
}

/** Demande une confirmation : vrai si le joueur choisit le bouton principal. */
export function confirmer(titre: string, message: string, ok: string, annuler = 'Annuler'): Promise<boolean> {
  return ouvrir({ titre, message, ok, annuler });
}

/** Affiche une information ; se résout quand la fenêtre est fermée. */
export async function informer(titre: string, message: string, ok = 'OK'): Promise<void> {
  await ouvrir({ titre, message, ok, annuler: null });
}
