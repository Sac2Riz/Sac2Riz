// PAVÉ COMMUN : état de chaque touche, d'après ce que dit le jeu. Code pur (testé sous Node) ;
// ecran-partie.ts s'en sert pour dessiner les touches.
//
// Deux informations distinctes viennent du jeu :
// - VueJeu.restants : combien de fois chaque valeur peut encore être posée dans la grille. À 0, la
//   touche est « épuisée » : estompée, mais toujours active (le joueur peut vouloir corriger) ;
// - InstanceVue.valeursPossibles : les valeurs qui ont un sens dans la case sélectionnée
//   (Tectonic : 1 à N dans une zone de N cases). Les autres sont « impossibles » : grisées et
//   désactivées, au clavier comme au toucher. null = aucune restriction.

/** État d'une touche du pavé commun. */
export type EtatTouche = {
  readonly valeur: string;
  /** Déjà posée partout (estompée, reste active). */
  readonly epuisee: boolean;
  /** Sans objet dans la case sélectionnée (grisée et désactivée). */
  readonly impossible: boolean;
  /** Touche désactivée (impossible, ou partie en pause / terminée). */
  readonly desactivee: boolean;
  /** Texte lu par le lecteur d'écran. */
  readonly libelle: string;
};

export type EntreesPave = {
  /** Valeurs du pavé, dans l'ordre (VueJeu.pave.valeurs). */
  readonly valeurs: readonly string[];
  /** VueJeu.restants (null = pas de décompte). */
  readonly restants: Readonly<Record<string, number>> | null;
  /** InstanceVue.valeursPossibles (null = toutes possibles). */
  readonly possibles: readonly string[] | null;
  /** Partie en pause ou terminée : tout le pavé est désactivé. */
  readonly bloque: boolean;
};

/** État de chaque touche du pavé, dans l'ordre des valeurs. */
export function etatsTouches(e: EntreesPave): EtatTouche[] {
  const possibles = e.possibles === null ? null : new Set(e.possibles);
  return e.valeurs.map((valeur) => {
    const impossible = possibles !== null && !possibles.has(valeur);
    const epuisee = e.restants !== null && (e.restants[valeur] ?? 0) === 0;
    const libelle = impossible ? `${valeur}, impossible dans cette case` : epuisee ? `${valeur}, déjà posé partout` : valeur;
    return { valeur, epuisee, impossible, desactivee: impossible || e.bloque, libelle };
  });
}

/** Vrai si la valeur peut être saisie (touche ou clavier physique) : elle est au pavé et possible. */
export function saisieAdmise(valeur: string, valeurs: readonly string[], possibles: readonly string[] | null): boolean {
  return valeurs.includes(valeur) && (possibles === null || possibles.includes(valeur));
}
