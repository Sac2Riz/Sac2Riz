// APRÈS UNE MISE À JOUR : décide si la fenêtre « Sac2Riz a été mis à jour » doit s'afficher au
// lancement, et avec quelles nouveautés. Code pur, testé sous Node.
//
// Pourquoi : le navigateur installe une version en attente dès que l'appli est complètement fermée
// (aucune page de l'ancienne version ouverte). Le joueur n'a alors ni confirmé ni vu les nouveautés :
// on les lui montre au lancement suivant.
//
// Règles (souhaitées par l'utilisateur) :
//  - jamais au tout premier lancement de l'appli (base neuve : aucune version précédente) ;
//  - une seule fois par nouvelle version (les groupes montrés sont notés comme vus) ;
//  - rien si aucune nouveauté visible depuis la dernière vue ;
//  - sinon, les nouveautés de toutes les versions publiées depuis la dernière vue (du plus récent au
//    plus ancien). Une mise à jour faite par le bouton « Mettre à jour » a déjà montré ses nouveautés :
//    elles sont notées comme vues avant le redémarrage (rien à remontrer).
// Une version précédente sans cette fonction (aucune trace de nouveautés vues, mais base existante) :
// le joueur n'a jamais vu de nouveautés, toutes celles du fichier sont montrées.

import type { FichierNouveautes, GroupeNouveautes, NouveautesVues } from '../../types/nouveautes.ts';

export type DecisionApresMiseAJour = {
  /** Groupes à montrer ([] : pas de fenêtre). */
  readonly montrer: readonly GroupeNouveautes[];
  /** Nouvelles nouveautés vues à enregistrer, ou null s'il n'y a rien à changer. */
  readonly enregistrer: NouveautesVues | null;
};

/** Ajoute des groupes aux nouveautés vues (sans doublon, dans l'ordre d'arrivée). */
export function marquerVues(vues: NouveautesVues | null, groupes: readonly GroupeNouveautes[]): NouveautesVues {
  const ids = [...(vues?.vues ?? [])];
  for (const g of groupes) if (!ids.includes(g.id)) ids.push(g.id);
  return { vues: ids };
}

/**
 * fichier : nouveautés de la version qui vient de démarrer (null : fichier absent, ex. npm run dev) ;
 * vues : nouveautés déjà vues (null : rien d'enregistré) ; baseNeuve : tout premier lancement.
 */
export function decisionApresMiseAJour(
  fichier: FichierNouveautes | null,
  vues: NouveautesVues | null,
  baseNeuve: boolean,
): DecisionApresMiseAJour {
  if (fichier === null) return { montrer: [], enregistrer: null };
  if (vues === null) {
    // Tout premier lancement : tout ce qui existe est connu d'emblée ; sinon, rien n'a jamais été montré
    return { montrer: baseNeuve ? [] : fichier.versions, enregistrer: marquerVues(null, fichier.versions) };
  }
  const deja = new Set(vues.vues);
  const nouvelles = fichier.versions.filter((g) => !deja.has(g.id));
  if (nouvelles.length === 0) return { montrer: [], enregistrer: null };
  return { montrer: nouvelles, enregistrer: marquerVues(vues, nouvelles) };
}
