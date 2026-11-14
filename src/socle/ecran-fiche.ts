// FICHE D'UN JEU (étape 6a) : on y arrive en touchant un jeu sur l'accueil.
// Contenu : nom et description (MetaJeu), aperçu en petit (la partie en cours, sinon la grille
// d'exemple de la fiche du jeu, dessinées par VueJeu.apercu, non jouables), « Continuer » (niveau,
// force exacte, temps) si une partie est en cours, « Nouvelle partie » avec le choix du niveau,
// les règles (FicheJeu.regles) et l'accès aux statistiques du jeu ; en haut à droite, « Réglages » (et
// « Mettre à jour » quand une nouvelle version est prête).
// Tout le contenu propre au jeu vient de son module (meta.ts, fiche.ts, vue.apercu) : le socle ne
// connaît aucun jeu. L'écran ne décide de rien : il appelle les actions de l'appli (app.ts).

import type { FicheJeu, MetaJeu } from '../types/jeu.ts';
import type { Json } from '../types/json.ts';
import { INFOS_NIVEAUX, type Force, type Niveau } from '../types/niveaux.ts';
import type { VueJeu } from '../types/vue.ts';
import { bouton, boutonIcone, creer, icone } from './dom.ts';
import { formaterTemps, libelleForce, plageForce } from './format.ts';

/** Partie en cours, telle que la fiche la présente. */
export type PartieFiche = {
  readonly niveau: Niveau;
  readonly force: Force;
  readonly chronoMs: number;
  /** État actuel de la partie (pour l'aperçu), ou null si elle n'a pas pu être relue. */
  readonly etat: Json | null;
  readonly donnees: Json;
};

export type OptionsFiche = {
  readonly meta: MetaJeu;
  readonly fiche: FicheJeu<Json, Json>;
  readonly vue: VueJeu<Json, Json, Json>;
  readonly partie: PartieFiche | null;
};

export type ActionsFiche = {
  readonly continuer: () => void;
  readonly nouvelle: (niveau: Niveau) => void;
  readonly statistiques: () => void;
  readonly reglages: () => void;
  /** Bouton « Mettre à jour » (visible seulement quand une nouvelle version est prête). */
  readonly boutonMiseAJour: () => HTMLElement;
  readonly retour: () => void;
};

/** Aperçu non jouable : partie en cours si elle est lisible, sinon la grille d'exemple. */
function apercu({ fiche, vue, partie }: OptionsFiche): HTMLElement {
  const cadre = creer('figure', 'fiche-apercu');
  const zone = creer('div', 'fiche-apercu-grille');
  zone.inert = true; // ni toucher ni clavier : ce n'est qu'une image de la grille
  const affichage =
    partie !== null && partie.etat !== null ? { donnees: partie.donnees, etat: partie.etat } : fiche.exemple;
  vue.apercu(zone, affichage);
  const legende = partie !== null && partie.etat !== null ? 'Votre partie en cours' : 'Exemple de grille';
  cadre.append(zone, creer('figcaption', 'fiche-apercu-legende', legende));
  return cadre;
}

function sectionJouer(o: OptionsFiche, actions: ActionsFiche): HTMLElement {
  const section = creer('section', 'fiche-jouer');
  section.setAttribute('aria-label', 'Jouer');
  if (o.partie !== null) {
    const { niveau, force, chronoMs } = o.partie;
    const continuer = bouton('bouton bouton-principal bouton-continuer', '', actions.continuer);
    continuer.append(
      creer('span', 'bouton-continuer-titre', 'Continuer'),
      creer('span', 'bouton-continuer-detail', `${libelleForce(niveau, force)} · ${formaterTemps(chronoMs)}`),
    );
    section.append(continuer);
  }
  const titre = creer('h2', 'fiche-sous-titre', 'Nouvelle partie');
  titre.id = 'fiche-nouvelle';
  const niveaux = creer('div', 'choix-niveaux');
  niveaux.setAttribute('role', 'group');
  niveaux.setAttribute('aria-labelledby', titre.id);
  for (const niveau of o.meta.niveaux) {
    const b = bouton(`bouton bouton-niveau niveau-${niveau}`, '', () => actions.nouvelle(niveau));
    const nom = INFOS_NIVEAUX[niveau].nom;
    const force = plageForce(niveau);
    b.setAttribute('aria-label', `Nouvelle partie, ${nom}, ${force}`);
    b.append(creer('span', 'bouton-niveau-nom', nom), creer('span', 'bouton-niveau-force', force));
    niveaux.append(b);
  }
  section.append(titre, niveaux);
  return section;
}

function sectionRegles({ fiche }: OptionsFiche): HTMLElement {
  const section = creer('section', 'fiche-regles');
  const titre = creer('h2', 'fiche-sous-titre', 'Règles');
  titre.id = 'fiche-regles-titre';
  section.setAttribute('aria-labelledby', titre.id);
  const liste = creer('ul', 'fiche-regles-liste');
  for (const regle of fiche.regles) liste.append(creer('li', '', regle));
  section.append(titre, liste);
  return section;
}

export function afficherFiche(conteneur: HTMLElement, o: OptionsFiche, actions: ActionsFiche): void {
  const ecran = creer('div', 'ecran-fiche');
  const barre = creer('header', 'ecran-barre');
  const titre = creer('h1', 'ecran-titre', o.meta.nom);
  const outils = creer('div', 'ecran-barre-outils');
  outils.append(actions.boutonMiseAJour(), boutonIcone('bouton-icone', 'reglages', 'Réglages', actions.reglages));
  barre.append(boutonIcone('bouton-icone', 'retour', 'Retour à l\'accueil', actions.retour), titre, outils);

  const presentation = creer('div', 'fiche-presentation');
  presentation.append(creer('p', 'fiche-description', o.meta.description), sectionJouer(o, actions));

  const stats = bouton('bouton bouton-menu fiche-stats', '', actions.statistiques);
  stats.append(icone('statistiques'), creer('span', '', `Statistiques — ${o.meta.nom}`));

  const corps = creer('div', 'fiche-corps');
  corps.append(apercu(o), presentation);
  // Décor de la direction de design (vide, rempli seulement par certaines directions : design/decors.ts)
  const decor = creer('div', 'decor');
  decor.setAttribute('aria-hidden', 'true');
  ecran.append(decor, barre, corps, sectionRegles(o), stats);
  conteneur.replaceChildren(ecran);
}
