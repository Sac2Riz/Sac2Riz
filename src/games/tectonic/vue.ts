// VUE du Tectonic : grille tactile découpée en zones. Seul fichier du jeu qui touche au DOM.
// Elle ne modifie jamais l'état : elle appelle contexte.jouer(action) et le socle la rappelle
// ensuite via afficher(). Ce que produit chaque toucher est calculé dans interaction.ts (code pur).
//
// Dessin : les cases forment une grille sans espace ; un calque SVG posé dessus trace les traits
// fins (dans une zone) puis les traits épais (entre deux zones), en pixels d'écran quelle que soit
// la taille de la grille (vector-effect: non-scaling-stroke) ; le cadre est le fond du plateau,
// comme au sudoku. Pavé commun 1 à 5 : les chiffres plus grands que la zone de la case sélectionnée
// sont grisés par le socle (valeursPossibles, contexte.selectionChangee à chaque sélection).
// Mises en évidence (réglage « mise en évidence ») : la zone de la case sélectionnée et les cases
// qui la touchent ; les autres cases portant le même chiffre, et ce chiffre dans les notes.
// Indice affiché (1er temps) : zones et carrés concernés en fond léger, cases du motif sur fond
// ambré, candidats du motif en couleur, candidats éliminés barrés, chiffre à placer en vert.
// Aperçu (fiche du jeu) : la même grille, sans sélection ni écouteur, chiffres et notes seulement.

import { chargerFeuilleDeStyle } from '../../socle/styles.ts';
import type { MarquesIndice } from '../../types/jeu.ts';
import type { AffichageVue, ContexteVue, InstanceVue, VueJeu, ZonesVue } from '../../types/vue.ts';
import { estActif } from '../../utils/reglages-jeu.ts';
import { nomCase } from './geometrie.ts';
import { structureDe } from './grille.ts';
import { actionSaisie, casesEnEvidence, deplacer, modePose, traits, valeursPossibles } from './interaction.ts';
import { RETRAIT_AUTO_NOTES } from './meta.ts';
import type { ActionTectonic, DonneesTectonic, EtatTectonic } from './types.ts';

/** Plus grand chiffre du pavé (zones de 5 cases au plus dans les grilles du jeu). */
const CHIFFRE_MAX = 5;
const SVG = 'http://www.w3.org/2000/svg';

/** Éléments d'une case. */
type Case = {
  readonly bouton: HTMLButtonElement;
  readonly chiffre: HTMLSpanElement;
  readonly notes: readonly HTMLSpanElement[];
};

/** Déplacements au clavier (flèches) : [lignes, colonnes]. */
const FLECHES: Readonly<Record<string, readonly [number, number]>> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** Marques d'un indice, rangées par case pour le dessin. */
type MarquesParCase = {
  readonly cellules: ReadonlySet<number>;
  readonly zones: ReadonlySet<number>;
  readonly motif: ReadonlyMap<number, readonly number[]>;
  readonly eliminees: ReadonlyMap<number, readonly number[]>;
  readonly placees: ReadonlyMap<number, number>;
};

function rangerMarques(indice: MarquesIndice | null): MarquesParCase | null {
  if (indice === null) return null;
  return {
    cellules: new Set(indice.cellules),
    zones: new Set(indice.zones),
    motif: new Map(indice.candidats.map((c) => [c.cellule, c.valeurs])),
    eliminees: new Map(indice.eliminations.map((c) => [c.cellule, c.valeurs])),
    placees: new Map(indice.placements.map((p) => [p.cellule, p.valeur])),
  };
}

function creerCase(cellule: number, choisir: (cellule: number) => void): Case {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'tectonic-case';
  bouton.setAttribute('role', 'gridcell');
  const chiffre = document.createElement('span');
  chiffre.className = 'tectonic-chiffre';
  const grilleNotes = document.createElement('span');
  grilleNotes.className = 'tectonic-notes';
  grilleNotes.setAttribute('aria-hidden', 'true');
  const notes = Array.from({ length: CHIFFRE_MAX }, () => {
    const note = document.createElement('span');
    note.className = 'tectonic-note';
    return note;
  });
  grilleNotes.append(...notes);
  bouton.append(chiffre, grilleNotes);
  bouton.addEventListener('click', () => choisir(cellule));
  return { bouton, chiffre, notes };
}

/** Calque des traits : fins puis épais, en coordonnées de cases. */
function creerTraits(donnees: DonneesTectonic): SVGSVGElement {
  const { fins, epais } = traits(donnees);
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'tectonic-traits');
  svg.setAttribute('viewBox', `0 0 ${donnees.colonnes} ${donnees.lignes}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  for (const [classe, d] of [['tectonic-trait-fin', fins], ['tectonic-trait-zone', epais]] as const) {
    const chemin = document.createElementNS(SVG, 'path');
    chemin.setAttribute('class', classe);
    chemin.setAttribute('d', d);
    chemin.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(chemin);
  }
  return svg;
}

/** Plateau : cadre, cases (grille sans espace) et calque des traits. */
function creerPlateau(donnees: DonneesTectonic, choisir: (cellule: number) => void): { plateau: HTMLDivElement; cases: Case[] } {
  const plateau = document.createElement('div');
  plateau.className = 'tectonic-grille';
  plateau.style.setProperty('--l', String(donnees.colonnes));
  plateau.style.setProperty('--h', String(donnees.lignes));
  const cellules = document.createElement('div');
  cellules.className = 'tectonic-cases';
  cellules.setAttribute('role', 'grid');
  cellules.setAttribute('aria-label', 'Grille de Tectonic');
  const cases = donnees.zones.map((_, cellule) => creerCase(cellule, choisir));
  cellules.append(...cases.map((c) => c.bouton), creerTraits(donnees));
  plateau.append(cellules);
  return { plateau, cases };
}

/** Chiffre et notes d'une case (partie et aperçu). */
function ecrireContenu(c: Case, valeur: number, notes: readonly number[]): void {
  c.chiffre.textContent = valeur !== 0 ? String(valeur) : '';
  c.notes.forEach((note, i) => {
    note.textContent = valeur === 0 && notes.includes(i + 1) ? String(i + 1) : '';
  });
}

/** Aperçu en lecture seule (fiche du jeu) : chiffres donnés, chiffres posés et notes. */
function apercu(conteneur: HTMLElement, { donnees, etat }: { readonly donnees: DonneesTectonic; readonly etat: EtatTectonic }): void {
  chargerFeuilleDeStyle(new URL('./style.css', import.meta.url));
  const { plateau, cases } = creerPlateau(donnees, () => {});
  plateau.querySelector('[role="grid"]')?.setAttribute('aria-label', 'Aperçu de la grille');
  cases.forEach((c, cellule) => {
    const valeur = etat.valeurs[cellule] ?? 0;
    const donnee = (donnees.enonce[cellule] ?? 0) !== 0;
    ecrireContenu(c, valeur, etat.notes[cellule] ?? []);
    c.bouton.classList.toggle('est-donnee', donnee);
    c.bouton.classList.toggle('est-saisie', !donnee && valeur !== 0);
    c.bouton.tabIndex = -1;
  });
  conteneur.append(plateau);
}

function monter({ grille: conteneur }: ZonesVue, contexte: ContexteVue<ActionTectonic>): InstanceVue<DonneesTectonic, EtatTectonic> {
  chargerFeuilleDeStyle(new URL('./style.css', import.meta.url));

  let selection: number | null = null;
  let dernier: AffichageVue<DonneesTectonic, EtatTectonic> | null = null;
  /** Plateau construit au premier affichage (il dépend de la carte des zones). */
  let plateau: { plateau: HTMLDivElement; cases: Case[] } | null = null;

  function choisir(cellule: number): void {
    selection = cellule;
    dessiner();
    contexte.selectionChangee();
  }

  function dessiner(): void {
    if (dernier === null) return;
    const { etat, donnees } = dernier;
    if (plateau === null) {
      plateau = creerPlateau(donnees, choisir);
      conteneur.append(plateau.plateau);
    }
    const { colonnes } = structureDe(donnees);
    const erreurs = new Set(dernier.erreurs);
    const marques = rangerMarques(dernier.indice);
    // Pendant un indice, seules ses marques sont mises en évidence
    const evidence = contexte.reglages().miseEnEvidence && marques === null;
    const autour = evidence ? casesEnEvidence(donnees, selection) : new Set<number>();
    const valeurSelection = selection === null || !evidence ? 0 : (etat.valeurs[selection] ?? 0);
    plateau.cases.forEach((c, cellule) => {
      const valeur = etat.valeurs[cellule] ?? 0;
      const notes = etat.notes[cellule] ?? [];
      const donnee = (donnees.enonce[cellule] ?? 0) !== 0;
      const placee = marques?.placees.get(cellule);
      const motif = marques?.motif.get(cellule) ?? [];
      const eliminees = marques?.eliminees.get(cellule) ?? [];
      c.chiffre.textContent = valeur !== 0 ? String(valeur) : placee !== undefined ? String(placee) : '';
      c.notes.forEach((note, i) => {
        const n = i + 1;
        const vide = valeur === 0 && placee === undefined;
        const estMotif = vide && motif.includes(n);
        const estEliminee = vide && eliminees.includes(n);
        const presente = vide && (notes.includes(n) || estMotif || estEliminee);
        note.textContent = presente ? String(n) : '';
        note.classList.toggle('est-meme', presente && n === valeurSelection);
        note.classList.toggle('est-motif', estMotif && !estEliminee);
        note.classList.toggle('est-eliminee', estEliminee);
      });
      const classes = c.bouton.classList;
      classes.toggle('est-donnee', donnee);
      classes.toggle('est-saisie', !donnee && valeur !== 0);
      classes.toggle('est-erreur', erreurs.has(cellule));
      classes.toggle('est-selection', marques === null && cellule === selection);
      classes.toggle('est-zone', autour.has(cellule));
      classes.toggle('est-meme', valeurSelection !== 0 && cellule !== selection && valeur === valeurSelection);
      classes.toggle('est-indice', marques !== null && (marques.cellules.has(cellule) || eliminees.length > 0));
      classes.toggle('est-zone-indice', marques !== null && marques.zones.has(cellule));
      classes.toggle('est-a-placer', placee !== undefined && valeur === 0);
      const contenu = valeur !== 0 ? `${valeur}${donnee ? ', donné' : ''}` : notes.length > 0 ? `notes ${notes.join(' ')}` : 'vide';
      const taille = structureDe(donnees).tailleCase[cellule] ?? 0;
      c.bouton.setAttribute('aria-label', `${nomCase(colonnes, cellule)}, zone de ${taille} : ${contenu}`);
      c.bouton.setAttribute('aria-selected', String(cellule === selection));
    });
  }

  /** Flèches du clavier (clavier physique ou tablette avec clavier) : déplacent la sélection. */
  function auClavier(evenement: KeyboardEvent): void {
    const deplacement = FLECHES[evenement.key];
    if (deplacement === undefined || dernier === null || document.querySelector('dialog[open]') !== null) return;
    evenement.preventDefault();
    choisir(deplacer(dernier.donnees, selection, deplacement[0], deplacement[1]));
  }
  document.addEventListener('keydown', auClavier);

  return {
    afficher(affichage) {
      dernier = affichage;
      dessiner();
    },
    saisir(texte) {
      if (dernier === null) return;
      const mode = modePose(contexte.modeNotes(), estActif(contexte.reglages().jeu, RETRAIT_AUTO_NOTES));
      const action = actionSaisie(dernier.donnees, selection, texte, mode);
      if (action !== null) contexte.jouer(action);
    },
    effacer() {
      if (selection !== null) contexte.jouer({ type: 'effacer', cellule: selection });
    },
    valeursPossibles() {
      return dernier === null ? null : valeursPossibles(dernier.donnees, selection);
    },
    detruire() {
      document.removeEventListener('keydown', auClavier);
      plateau?.plateau.remove();
    },
  };
}

export const vue: VueJeu<DonneesTectonic, EtatTectonic, ActionTectonic> = {
  pave: { type: 'commun', valeurs: Array.from({ length: CHIFFRE_MAX }, (_, i) => String(i + 1)) },
  outilsMasques: [],
  monter,
  apercu,
  // Pas de décompte : le nombre d'occurrences de chaque chiffre dépend des zones
  restants: () => null,
};
