// VUE du sudoku classique : grille 9 × 9 tactile. Seul fichier du jeu qui touche au DOM.
// Elle ne modifie jamais l'état : elle appelle contexte.jouer(action) et le socle la rappelle
// ensuite via afficher().
//
// Mises en évidence autour de la case sélectionnée (réglage « mise en évidence ») : sa ligne, sa
// colonne et son bloc ; les autres cases portant le même chiffre, et ce chiffre dans les notes.
// Indice affiché (1er temps) : régions concernées en fond léger, cases du motif sur fond ambré, candidats du motif en couleur,
// candidats éliminés barrés en rouge (dessinés même si le joueur ne les a pas notés), chiffre à
// placer en vert ; les autres mises en évidence sont alors suspendues.

import { chargerFeuilleDeStyle } from '../../socle/styles.ts';
import type { MarquesIndice } from '../../types/jeu.ts';
import type { AffichageVue, ContexteVue, InstanceVue, VueJeu, ZonesVue } from '../../types/vue.ts';
import { blocDe, colonneDe, ligneDe, seVoient } from './geometrie.ts';
import { NOMBRE_CASES, TAILLE, type ActionSudoku, type DonneesSudoku, type EtatSudoku } from './types.ts';

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
  bouton.className = 'sudoku-classique-case';
  bouton.setAttribute('role', 'gridcell');
  const chiffre = document.createElement('span');
  chiffre.className = 'sudoku-classique-chiffre';
  const grilleNotes = document.createElement('span');
  grilleNotes.className = 'sudoku-classique-notes';
  grilleNotes.setAttribute('aria-hidden', 'true');
  const notes = Array.from({ length: TAILLE }, () => {
    const note = document.createElement('span');
    note.className = 'sudoku-classique-note';
    return note;
  });
  grilleNotes.append(...notes);
  bouton.append(chiffre, grilleNotes);
  bouton.addEventListener('click', () => choisir(cellule));
  return { bouton, chiffre, notes };
}

/** Action produite par une touche du pavé, selon le mode notes et le réglage du retrait des notes. */
function typePose(contexte: ContexteVue<ActionSudoku>): 'noter' | 'placer' | 'placer-seul' {
  if (contexte.modeNotes()) return 'noter';
  return contexte.reglages().retraitAutoNotes ? 'placer' : 'placer-seul';
}

function monter({ grille: conteneur }: ZonesVue, contexte: ContexteVue<ActionSudoku>): InstanceVue<DonneesSudoku, EtatSudoku> {
  chargerFeuilleDeStyle(new URL('./style.css', import.meta.url));

  let selection: number | null = null;
  let dernier: AffichageVue<DonneesSudoku, EtatSudoku> | null = null;

  // Grille = 9 blocs (séparés par un trait épais), chacun de 9 cases (séparées par un trait fin)
  const plateau = document.createElement('div');
  plateau.className = 'sudoku-classique-grille';
  plateau.setAttribute('role', 'grid');
  plateau.setAttribute('aria-label', 'Grille de sudoku');
  const blocs = Array.from({ length: TAILLE }, () => {
    const bloc = document.createElement('div');
    bloc.className = 'sudoku-classique-bloc';
    return bloc;
  });
  const cases: Case[] = [];
  for (let cellule = 0; cellule < NOMBRE_CASES; cellule++) {
    const c = creerCase(cellule, choisir);
    cases.push(c);
    blocs[blocDe(cellule)]?.append(c.bouton);
  }
  plateau.append(...blocs);
  conteneur.append(plateau);

  function choisir(cellule: number): void {
    selection = cellule;
    dessiner();
  }

  function dessiner(): void {
    if (dernier === null) return;
    const { etat, donnees } = dernier;
    const erreurs = new Set(dernier.erreurs);
    const marques = rangerMarques(dernier.indice);
    // Pendant un indice, seules ses marques sont mises en évidence
    const evidence = contexte.reglages().miseEnEvidence && marques === null;
    const valeurSelection = selection === null || !evidence ? 0 : (etat.valeurs[selection] ?? 0);
    cases.forEach((c, cellule) => {
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
      classes.toggle('est-zone', evidence && selection !== null && seVoient(cellule, selection));
      classes.toggle('est-meme', valeurSelection !== 0 && cellule !== selection && valeur === valeurSelection);
      classes.toggle('est-indice', marques !== null && (marques.cellules.has(cellule) || eliminees.length > 0));
      classes.toggle('est-zone-indice', marques !== null && marques.zones.has(cellule));
      classes.toggle('est-a-placer', placee !== undefined && valeur === 0);
      const contenu = valeur !== 0 ? `${valeur}${donnee ? ', donné' : ''}` : notes.length > 0 ? `notes ${notes.join(' ')}` : 'vide';
      c.bouton.setAttribute('aria-label', `Ligne ${ligneDe(cellule) + 1}, colonne ${colonneDe(cellule) + 1} : ${contenu}`);
      c.bouton.setAttribute('aria-selected', String(cellule === selection));
    });
  }

  /** Flèches du clavier (clavier physique ou tablette avec clavier) : déplacent la sélection. */
  function auClavier(evenement: KeyboardEvent): void {
    const deplacement = FLECHES[evenement.key];
    if (deplacement === undefined) return;
    evenement.preventDefault();
    const depart = selection ?? 0;
    const ligne = (ligneDe(depart) + deplacement[0] + TAILLE) % TAILLE;
    const colonne = (colonneDe(depart) + deplacement[1] + TAILLE) % TAILLE;
    choisir(selection === null ? 0 : ligne * TAILLE + colonne);
  }
  document.addEventListener('keydown', auClavier);

  return {
    afficher(affichage) {
      dernier = affichage;
      dessiner();
    },
    saisir(texte) {
      const valeur = Number(texte);
      if (selection === null || !Number.isInteger(valeur) || valeur < 1 || valeur > TAILLE) return;
      contexte.jouer({ type: typePose(contexte), cellule: selection, valeur });
    },
    effacer() {
      if (selection !== null) contexte.jouer({ type: 'effacer', cellule: selection });
    },
    detruire() {
      document.removeEventListener('keydown', auClavier);
      plateau.remove();
    },
  };
}

/** Nombre de fois où chaque chiffre peut encore être posé (9 moins ses occurrences dans la grille). */
function restants(etat: EtatSudoku): Readonly<Record<string, number>> {
  const compte: Record<string, number> = {};
  for (let v = 1; v <= TAILLE; v++) compte[String(v)] = TAILLE;
  for (const v of etat.valeurs) {
    const cle = String(v);
    const actuel = compte[cle];
    if (v !== 0 && actuel !== undefined) compte[cle] = Math.max(0, actuel - 1);
  }
  return compte;
}

export const vue: VueJeu<DonneesSudoku, EtatSudoku, ActionSudoku> = {
  pave: { type: 'commun', valeurs: Array.from({ length: TAILLE }, (_, i) => String(i + 1)) },
  outilsMasques: [],
  monter,
  restants,
};
