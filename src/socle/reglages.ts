// RÉGLAGES : conversion des réglages relus (stockage, fichier importé) et lecture des réglages d'un
// jeu. Code pur, testé sous Node.
//
// Conversion (normaliserReglages) — rien de ce que le joueur a choisi n'est perdu :
// - réglages par section : les valeurs des jeux qui ne sont pas des oui/non sont ignorées, une à une ;
// - style (étape 6c) : absent (réglages d'avant) ou inconnu → style par défaut (Rétro) ;
// - anciennes formes « à plat » (étapes 3b à 5 : ReglagesV1, V2, V3) : thème, vérification des
//   erreurs et mise en évidence gardent leur valeur ; les deux réglages qui étaient propres à un jeu
//   sont rangés sous ce jeu (table ANCIENS_REGLAGES_DE_JEU, figée : elle décrit le passé) ;
//   ce qui manque prend la valeur par défaut.

import type { MetaJeu, ValeursReglagesJeu } from '../types/jeu.ts';
import { REGLAGES_PAR_DEFAUT, type Reglages, type ReglagesEnregistres } from '../types/sauvegarde.ts';
import { estStyle, STYLE_PAR_DEFAUT } from '../types/style.ts';
import type { ReglagesVue } from '../types/vue.ts';
import { valeursCompletes } from '../utils/reglages-jeu.ts';

/**
 * Réglages « à plat » d'avant l'étape 6a qui sont devenus des réglages d'un jeu :
 * clé ancienne → [id du jeu, id du réglage dans MetaJeu.reglages]. Ne jamais modifier.
 */
export const ANCIENS_REGLAGES_DE_JEU: Readonly<Record<'retraitAutoNotes' | 'nombreAuDepart', readonly [string, string]>> = {
  retraitAutoNotes: ['sudoku-classique', 'retraitAutoNotes'],
  nombreAuDepart: ['chiffres-cases', 'nombreAuDepart'],
};

/** Réglages complets dans la forme actuelle, quelle que soit la forme relue. */
export function normaliserReglages(enregistres: ReglagesEnregistres | null): Reglages {
  if (enregistres === null) return REGLAGES_PAR_DEFAUT;
  const communs = {
    style: 'style' in enregistres && estStyle(enregistres.style) ? enregistres.style : STYLE_PAR_DEFAUT,
    theme: enregistres.theme,
    verifierErreurs: enregistres.verifierErreurs,
    miseEnEvidence: 'miseEnEvidence' in enregistres ? enregistres.miseEnEvidence : REGLAGES_PAR_DEFAUT.miseEnEvidence,
  };

  if ('jeux' in enregistres) {
    const jeux = Object.entries(enregistres.jeux).map(([jeu, valeurs]) => [
      jeu,
      Object.fromEntries(Object.entries(valeurs).filter((e): e is [string, boolean] => typeof e[1] === 'boolean')),
    ]);
    return { ...communs, jeux: Object.fromEntries(jeux) };
  }

  // Ancienne forme à plat
  const plat: { readonly [cle: string]: unknown } = enregistres;
  const jeux: { [jeu: string]: { [id: string]: boolean } } = {};
  for (const [cle, [jeu, id]] of Object.entries(ANCIENS_REGLAGES_DE_JEU)) {
    const valeur = plat[cle];
    if (typeof valeur === 'boolean') jeux[jeu] = { ...jeux[jeu], [id]: valeur };
  }
  return { ...communs, jeux };
}

/** Valeurs de tous les réglages déclarés par un jeu (valeurs par défaut complétées). */
export function reglagesDuJeu(reglages: Reglages, meta: MetaJeu): ValeursReglagesJeu {
  return valeursCompletes(meta.reglages, reglages.jeux[meta.id]);
}

/** Nouveaux réglages après le changement d'un réglage d'un jeu. */
export function changerReglageJeu(reglages: Reglages, jeu: string, id: string, valeur: boolean): Reglages {
  return { ...reglages, jeux: { ...reglages.jeux, [jeu]: { ...reglages.jeux[jeu], [id]: valeur } } };
}

/** Ce que la vue d'un jeu voit des réglages (ContexteVue.reglages). */
export function reglagesVue(reglages: Reglages, meta: MetaJeu): ReglagesVue {
  return {
    verifierErreurs: reglages.verifierErreurs,
    miseEnEvidence: reglages.miseEnEvidence,
    jeu: reglagesDuJeu(reglages, meta),
  };
}
