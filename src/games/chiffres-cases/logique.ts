// LOGIQUE des chiffres casés : implémente LogiqueJeu (src/types/jeu.ts).
// Code PUR : aucun accès au DOM, aucune mutation. Le worker charge l'export « logique ».
// Le détail est réparti dans les fichiers voisins (voir docs/ARCHITECTURE.md) :
// grille / probleme (modèle), solveur/ (techniques), generateur, notation, regles, indice, gardes.

import type { Alea } from '../../types/alea.ts';
import type { LogiqueJeu, OptionsGeneration, ResultatGeneration } from '../../types/jeu.ts';
import type { Niveau } from '../../types/niveaux.ts';
import { estActionCases, estDonneesCases, estEtatCases } from './gardes.ts';
import { nombreAuDepart } from './depart.ts';
import { genererCases } from './generateur.ts';
import { indiceCases, nomTechnique } from './indice.ts';
import { META } from './meta.ts';
import { noterCases } from './notation.ts';
import { structureDe } from './probleme.ts';
import { casesFausses, effacerEmplacement, estTermineeCases, etatInitialCases, placerNombre } from './regles.ts';
import type { ActionCases, DonneesCases, EtatCases } from './types.ts';

function generer(niveau: Niveau, alea: Alea, options: OptionsGeneration): ResultatGeneration<DonneesCases> {
  const r = genererCases(niveau, alea, { doitArreter: options.doitArreter });
  return r.ok ? { ok: true, donnees: r.donnees, notation: r.notation } : { ok: false, raison: r.raison };
}

/** Une action sans effet renvoie l'état reçu, tel quel (le socle ne l'enregistre alors pas). */
function appliquer(etat: EtatCases, action: ActionCases, donnees: DonneesCases): EtatCases {
  // État d'une autre grille (sauvegarde incohérente) : on n'y touche pas
  if (etat.places.length !== structureDe(donnees).probleme.grille.emplacements.length) return etat;
  return action.type === 'placer'
    ? placerNombre(etat, donnees, action.emplacement, action.nombre)
    : effacerEmplacement(etat, donnees, action.emplacement);
}

export const logique: LogiqueJeu<DonneesCases, EtatCases, ActionCases> = {
  meta: META,
  generer,
  noter: noterCases,
  preparer: (donnees, options) => (options.nombreAuDepart ? nombreAuDepart(donnees) : donnees),
  etatInitial: etatInitialCases,
  appliquer,
  erreurs: casesFausses,
  estTerminee: estTermineeCases,
  indice: (etat, donnees) => indiceCases(etat, donnees),
  nomTechnique,
  estDonnees: estDonneesCases,
  estEtat: estEtatCases,
  estAction: estActionCases,
};
