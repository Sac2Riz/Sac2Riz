// VUE des chiffres casés : grille à cases noires et liste des nombres (dans la zone du pavé, que le
// socle confie à la vue : pavé « personnalise »). Seul fichier du jeu qui touche au DOM.
// Elle ne modifie jamais l'état : elle appelle contexte.jouer(action) et le socle la rappelle
// ensuite via afficher(). Toute la logique des touchers est dans interaction.ts (code pur, testé).
//
// Affichage : emplacement sélectionné en surbrillance (ou, nombre d'abord, ses emplacements cibles),
// chiffres des pré-placés en gras, erreurs en rouge, signal bref sur les cases quittées par un nombre
// déplacé, clignotement des cases en conflit quand une pose est refusée. Indice affiché (1er temps) : cases de l'emplacement sur fond ambré avec ses chiffres en
// vert, emplacements qui justifient la déduction en fond léger ; la sélection est alors suspendue.
// Liste : groupée par longueur, toujours dans le même ordre ; le groupe de la sélection est surligné
// (et, s'il est hors de vue, la liste défile doucement juste assez pour le montrer) ; nombres utilisés
// barrés (toujours touchables : les placer ailleurs les déplace), verrouillés s'ils sont pré-placés.

import { chargerFeuilleDeStyle } from '../../socle/styles.ts';
import type { AffichageVue, ContexteVue, InstanceVue, VueJeu, ZonesVue } from '../../types/vue.ts';
import {
  actionEffacer,
  AUCUNE,
  casesEnEvidence,
  defilementPourVoir,
  groupesListe,
  longueurSelection,
  selectionParFleche,
  selectionValide,
  toucherCase,
  toucherNombre,
  type GroupeListe,
  type Reaction,
  type Selection,
  type Signal,
} from './interaction.ts';
import { structureDe } from './probleme.ts';
import { chiffresDesCases } from './regles.ts';
import { NOIRE, type ActionCases, type DonneesCases, type EtatCases } from './types.ts';

/** Durée des signaux (voir les animations dans style.css) : nombre déplacé, pose refusée (3 pulsations). */
const DUREE_SIGNAL_MS: Readonly<Record<Signal['type'], number>> = { deplacement: 900, conflit: 1050 };

/** Déplacements au clavier (flèches) : [lignes, colonnes]. */
const FLECHES: Readonly<Record<string, readonly [number, number]>> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

function element<K extends keyof HTMLElementTagNameMap>(balise: K, classe: string, texte = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(balise);
  e.className = classe;
  if (texte !== '') e.textContent = texte;
  return e;
}

/** Plateau de la grille : une case par cellule (bouton si blanche). */
function creerPlateau(donnees: DonneesCases): { plateau: HTMLElement; cases: (HTMLButtonElement | null)[] } {
  const plateau = element('div', 'chiffres-cases-grille');
  plateau.setAttribute('role', 'grid');
  plateau.setAttribute('aria-label', 'Grille de chiffres casés');
  plateau.style.setProperty('--l', String(donnees.largeur));
  plateau.style.setProperty('--h', String(donnees.hauteur));
  const cases = donnees.solution.map((v, cellule) => {
    if (v === NOIRE) {
      plateau.append(element('div', 'chiffres-cases-noire'));
      return null;
    }
    const b = element('button', 'chiffres-cases-case');
    b.type = 'button';
    b.dataset['cellule'] = String(cellule);
    b.setAttribute('role', 'gridcell');
    plateau.append(b);
    return b;
  });
  return { plateau, cases };
}

/** Liste des nombres, groupe par groupe. */
function dessinerListe(liste: HTMLElement, groupes: readonly GroupeListe[]): void {
  liste.replaceChildren(
    ...groupes.map((g) => {
      const section = element('section', `chiffres-cases-groupe${g.enAvant ? ' est-en-avant' : ''}`);
      section.append(element('h3', 'chiffres-cases-groupe-titre', `${g.longueur} chiffres`));
      const nombres = element('div', 'chiffres-cases-nombres');
      for (const n of g.nombres) {
        const b = element('button', 'chiffres-cases-nombre', n.texte);
        b.type = 'button';
        b.dataset['nombre'] = n.texte;
        const c = b.classList;
        c.toggle('est-utilise', n.etat !== 'libre');
        c.toggle('est-verrouille', n.etat === 'verrouille');
        c.toggle('est-estompe', n.estompe);
        c.toggle('est-choisi', n.choisi);
        b.disabled = n.etat === 'verrouille';
        b.setAttribute('aria-pressed', String(n.choisi));
        const etat = n.etat === 'verrouille' ? ', donné' : n.etat === 'utilise' ? ', déjà utilisé' : '';
        b.setAttribute('aria-label', `${n.texte}${etat}${n.estompe ? ', autre longueur' : ''}`);
        nombres.append(b);
      }
      section.append(nombres);
      return section;
    }),
  );
}

function monter(zones: ZonesVue, contexte: ContexteVue<ActionCases>): InstanceVue<DonneesCases, EtatCases> {
  chargerFeuilleDeStyle(new URL('./style.css', import.meta.url));
  if (zones.pave === null) throw new Error('Chiffres casés : la zone du pavé doit être confiée à la vue');
  const zoneListe = zones.pave;

  let selection: Selection = AUCUNE;
  let dernier: AffichageVue<DonneesCases, EtatCases> | null = null;
  let plateau: { plateau: HTMLElement; cases: (HTMLButtonElement | null)[] } | null = null;
  let signal: { readonly type: Signal['type']; readonly cases: ReadonlySet<number> } | null = null;
  /** Vrai juste après un nouveau signal : l'animation doit repartir de zéro (même cases qu'avant). */
  let signalNeuf = false;
  let minuterieSignal: ReturnType<typeof setTimeout> | null = null;
  let longueurAffichee: number | null = null;

  const liste = element('div', 'chiffres-cases-liste');
  liste.setAttribute('aria-label', 'Nombres à placer');
  zoneListe.append(liste);

  function montrerSignal(s: Signal): void {
    signal = { type: s.type, cases: new Set(s.cases) };
    signalNeuf = true;
    if (minuterieSignal !== null) clearTimeout(minuterieSignal);
    minuterieSignal = setTimeout(() => {
      signal = null;
      minuterieSignal = null;
      dessiner();
    }, DUREE_SIGNAL_MS[s.type]);
  }

  /**
   * Applique un toucher. Une pose acceptée est jouée tout de suite (le socle enregistre le coup,
   * sauvegarde et contrôle la fin de partie, puis rappelle afficher()) et la sélection est levée.
   */
  function reagir(r: Reaction): void {
    selection = r.selection;
    if (r.signal !== null) montrerSignal(r.signal);
    if (r.action !== null) contexte.jouer(r.action);
    dessiner(); // sans action (ou action sans effet), afficher() n'est pas rappelé
  }

  /** Toucher dans la zone de la grille : une case blanche, sinon une « zone vide » (noire, marge). */
  function auToucherGrille(evenement: MouseEvent): void {
    if (dernier === null || !(evenement.target instanceof Element)) return;
    if (evenement.target.closest('.partie-pause') !== null) return; // bouton « Reprendre » du socle
    const caseTouchee = evenement.target.closest<HTMLElement>('[data-cellule]');
    const cellule = caseTouchee === null ? null : Number(caseTouchee.dataset['cellule']);
    reagir(toucherCase(selection, dernier.etat, dernier.donnees, cellule));
  }

  function auToucherListe(evenement: MouseEvent): void {
    if (dernier === null || !(evenement.target instanceof Element)) return;
    const nombre = evenement.target.closest<HTMLElement>('[data-nombre]')?.dataset['nombre'];
    if (nombre === undefined) return;
    reagir(toucherNombre(selection, dernier.etat, dernier.donnees, nombre));
  }

  zones.grille.addEventListener('click', auToucherGrille);
  liste.addEventListener('click', auToucherListe);

  function dessiner(): void {
    if (dernier === null) return;
    const { etat, donnees } = dernier;
    if (plateau === null) {
      plateau = creerPlateau(donnees);
      zones.grille.prepend(plateau.plateau);
    }
    selection = selectionValide(selection, etat, donnees);
    const { grille } = structureDe(donnees).probleme;
    const marques = dernier.indice;
    // Pendant un indice, seules ses marques sont mises en évidence
    const evidence = marques === null ? casesEnEvidence(selection, etat, donnees) : { selection: new Set(), cibles: new Set() };
    const erreurs = new Set(dernier.erreurs);
    const chiffres = chiffresDesCases(etat, donnees);
    const fixes = new Set(donnees.preplaces.flatMap((id) => grille.emplacements[id]?.cellules ?? []));
    const motif = new Set(marques?.cellules ?? []);
    const zonesIndice = new Set(marques?.zones ?? []);
    const aPlacer = new Map((marques?.placements ?? []).map((p) => [p.cellule, p.valeur]));
    const touchee = marques === null && selection.type === 'emplacement' ? selection.cellule : -1;

    plateau.cases.forEach((b, cellule) => {
      if (b === null) return;
      const chiffre = chiffres[cellule] ?? null;
      const place = aPlacer.get(cellule);
      b.textContent = chiffre !== null ? String(chiffre) : place !== undefined ? String(place) : '';
      const c = b.classList;
      c.toggle('est-fixe', fixes.has(cellule));
      c.toggle('est-erreur', erreurs.has(cellule));
      c.toggle('est-selection', evidence.selection.has(cellule));
      c.toggle('est-touchee', cellule === touchee);
      c.toggle('est-cible', evidence.cibles.has(cellule));
      const signalee = signal !== null && signal.cases.has(cellule);
      if (signalee && signalNeuf) {
        // Relance l'animation même si la case clignotait déjà (deux refus de suite)
        c.remove('est-signal', 'est-conflit');
        void b.offsetWidth;
      }
      c.toggle('est-signal', signalee && signal?.type === 'deplacement');
      c.toggle('est-conflit', signalee && signal?.type === 'conflit');
      c.toggle('est-indice', motif.has(cellule));
      c.toggle('est-zone-indice', zonesIndice.has(cellule));
      c.toggle('est-a-placer', place !== undefined && chiffre === null);
      const l = Math.floor(cellule / donnees.largeur) + 1;
      const col = (cellule % donnees.largeur) + 1;
      const contenu = chiffre === null ? 'vide' : `${chiffre}${fixes.has(cellule) ? ', donné' : ''}`;
      b.setAttribute('aria-label', `Ligne ${l}, colonne ${col} : ${contenu}`);
      b.setAttribute('aria-selected', String(evidence.selection.has(cellule)));
    });

    signalNeuf = false;
    dessinerListe(liste, groupesListe(selection, etat, donnees));
    // Nouvelle longueur visée : son groupe (resté à sa place) est montré s'il est hors de vue
    const longueur = longueurSelection(selection, donnees);
    if (longueur !== null && longueur !== longueurAffichee) montrerGroupe();
    longueurAffichee = longueur;
  }

  /** Fait défiler la liste juste assez pour voir le groupe mis en avant (rien si déjà visible). */
  function montrerGroupe(): void {
    const groupe = liste.querySelector<HTMLElement>('.chiffres-cases-groupe.est-en-avant');
    if (groupe === null) return;
    const zone = zoneListe.getBoundingClientRect();
    const r = groupe.getBoundingClientRect();
    // Position du groupe dans le contenu qui défile
    const haut = r.top - zone.top - zoneListe.clientTop + zoneListe.scrollTop;
    const cible = defilementPourVoir({ haut, bas: haut + r.height }, zoneListe.scrollTop, zoneListe.clientHeight);
    if (cible === null) return;
    const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    zoneListe.scrollTo({ top: cible, behavior: doux ? 'smooth' : 'auto' });
  }

  function auClavier(evenement: KeyboardEvent): void {
    if (dernier === null || document.querySelector('dialog[open]') !== null) return;
    if (evenement.key === 'Escape') {
      selection = AUCUNE;
      dessiner();
      return;
    }
    const deplacement = FLECHES[evenement.key];
    if (deplacement === undefined) return;
    evenement.preventDefault();
    selection = selectionParFleche(selection, dernier.donnees, deplacement[0], deplacement[1]);
    dessiner();
  }
  document.addEventListener('keydown', auClavier);

  return {
    afficher(affichage) {
      dernier = affichage;
      dessiner();
    },
    saisir() {
      // Pas de pavé commun : les nombres se touchent dans la liste
    },
    effacer() {
      if (dernier === null) return;
      const action = actionEffacer(selection, dernier.etat, dernier.donnees);
      if (action !== null) contexte.jouer(action);
    },
    detruire() {
      document.removeEventListener('keydown', auClavier);
      zones.grille.removeEventListener('click', auToucherGrille);
      if (minuterieSignal !== null) clearTimeout(minuterieSignal);
      plateau?.plateau.remove();
      liste.remove();
    },
  };
}

export const vue: VueJeu<DonneesCases, EtatCases, ActionCases> = {
  pave: { type: 'personnalise' },
  // Le joueur ne prend pas de notes : un emplacement reçoit un nombre entier ou rien
  outilsMasques: ['notes'],
  monter,
  restants: () => null,
};
