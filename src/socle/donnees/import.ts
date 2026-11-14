// IMPORT D'UNE SAUVEGARDE : analyse COMPLÈTE du fichier avant la moindre écriture. Code pur.
// Un fichier refusé ne modifie rien ; le message explique pourquoi, en français simple.
// Contrôles, dans l'ordre :
//   1. texte JSON lisible ;
//   2. fichier de sauvegarde Sac2Riz (champ « format ») ;
//   3. version du format connue (une version plus récente vient d'une appli plus récente) ; un
//      fichier n° 1 (avant l'étape 6a) est accepté : ses réglages « à plat » sont convertis ;
//   4. chaque donnée, avec les gardes de type de la relecture du stockage (gardes-sauvegarde.ts) ;
//   5. jeux connus de cette version de l'appli, une seule partie en cours par jeu ;
//   6. chaque partie en cours REJOUÉE par la logique de son jeu (gardes estDonnees / estAction,
//      versionFormat, historique cohérent) : exactement ce que fera « Continuer ».

import type { Json } from '../../types/json.ts';
import { estNiveau } from '../../types/niveaux.ts';
import {
  VERSION_EXPORT,
  type DonneesExportees,
  type EtatPack,
  type PartieSauvegardee,
  type Reglages,
  type StatsJeu,
} from '../../types/sauvegarde.ts';
import { estObjet } from '../../utils/gardes-json.ts';
import {
  estDateIso,
  estEtatPack,
  estPartieSauvegardee,
  estReglagesBruts,
  estReglagesV1,
  estStatsJeu,
} from '../../utils/gardes-sauvegarde.ts';
import { depuisSauvegarde, type Logique } from '../partie.ts';
import { normaliserReglages } from '../reglages.ts';

/** Versions du fichier d'export acceptées à l'import (n° 1 : réglages à plat, convertis). */
const VERSIONS_ACCEPTEES: readonly number[] = [1, VERSION_EXPORT];

/** Ce que le joueur voit avant de confirmer le remplacement. */
export type ResumeImport = {
  /** Date de l'export (ISO 8601). */
  readonly exporteLe: string;
  /** Nombre de parties en cours dans le fichier. */
  readonly parties: number;
  /** Nombre total de parties terminées (tous jeux et niveaux). */
  readonly terminees: number;
};

export type ResultatImport =
  | { readonly ok: true; readonly donnees: DonneesExportees; readonly resume: ResumeImport }
  | { readonly ok: false; readonly message: string };

const refus = (message: string): ResultatImport => ({ ok: false, message });

/**
 * Analyse le texte d'un fichier importé. logiques : la logique de chaque jeu de l'appli
 * (pour reconnaître les jeux et rejouer les parties en cours).
 */
export function analyserImport(texte: string, logiques: readonly Logique[]): ResultatImport {
  let valeur: unknown;
  try {
    valeur = JSON.parse(texte);
  } catch {
    return refus('Ce fichier est illisible : ce n\'est pas une sauvegarde Sac2Riz.');
  }
  if (!estObjet(valeur) || valeur['format'] !== 'sac2riz-export') {
    return refus('Ce fichier n\'est pas une sauvegarde Sac2Riz.');
  }
  const { version, exporteLe, donnees } = valeur;
  if (typeof version === 'number' && Number.isInteger(version) && version > VERSION_EXPORT) {
    return refus(
      `Cette sauvegarde a été faite avec une version plus récente de Sac2Riz (format n° ${version}). ` +
        'Mettez l\'appli à jour, puis recommencez l\'import.',
    );
  }
  if (typeof version !== 'number' || !VERSIONS_ACCEPTEES.includes(version)) return refus('Version de sauvegarde inconnue : ce fichier ne peut pas être importé.');
  if (!estDateIso(exporteLe) || !estObjet(donnees)) return refus('Sauvegarde incomplète ou abîmée.');

  const parJeu = new Map(logiques.map((l) => [l.meta.id, l]));
  const resultat = verifierDonnees(donnees, parJeu, version);
  if (typeof resultat === 'string') return refus(resultat);
  const terminees = Object.values(resultat.stats).reduce(
    (total, statsJeu) => total + Object.values(statsJeu).reduce((n, s) => n + s.terminees, 0),
    0,
  );
  return { ok: true, donnees: resultat, resume: { exporteLe, parties: resultat.parties.length, terminees } };
}

/**
 * Réglages du fichier dans la forme actuelle, ou null s'ils sont abîmés. N° 1 : réglages à plat
 * (étapes 3b à 5), convertis ; n° 2 : forme actuelle, valeurs des jeux qui ne sont pas des oui/non ignorées.
 */
function lireReglages(valeur: Json | undefined, version: number): Reglages | null {
  if (version === 1) {
    const aPlat = estReglagesV1(valeur) && !(estObjet(valeur) && 'jeux' in valeur);
    return aPlat ? normaliserReglages(valeur) : null;
  }
  return estReglagesBruts(valeur) ? normaliserReglages(valeur) : null;
}

/** Données vérifiées, ou le message expliquant le refus. */
function verifierDonnees(
  donnees: { readonly [cle: string]: Json },
  parJeu: ReadonlyMap<string, Logique>,
  version: number,
): DonneesExportees | string {
  const { reglages: reglagesLus, parties, stats, packsJoues } = donnees;
  const reglages = lireReglages(reglagesLus, version);
  if (reglages === null) return 'Les réglages de la sauvegarde sont abîmés.';

  if (!Array.isArray(parties)) return 'Les parties en cours de la sauvegarde sont abîmées.';
  const partiesLues: PartieSauvegardee[] = [];
  for (const partie of parties) {
    if (!estPartieSauvegardee(partie)) return 'Une partie en cours de la sauvegarde est abîmée.';
    const logique = parJeu.get(partie.jeu);
    if (logique === undefined) return `La sauvegarde contient un jeu inconnu de cette version de l'appli (« ${partie.jeu} »).`;
    if (partiesLues.some((p) => p.jeu === partie.jeu)) return `La sauvegarde contient deux parties en cours de ${logique.meta.nom}.`;
    if (depuisSauvegarde(logique, partie, 0, true) === null) {
      return `La partie en cours de ${logique.meta.nom} ne peut pas être reprise (grille ou coups invalides).`;
    }
    partiesLues.push(partie);
  }

  if (!estObjet(stats)) return 'Les statistiques de la sauvegarde sont abîmées.';
  const statsLues: [string, StatsJeu][] = [];
  for (const [jeu, statsJeu] of Object.entries(stats)) {
    if (!parJeu.has(jeu)) return `La sauvegarde contient un jeu inconnu de cette version de l'appli (« ${jeu} »).`;
    if (!estStatsJeu(statsJeu)) return 'Les statistiques de la sauvegarde sont abîmées.';
    statsLues.push([jeu, statsJeu]);
  }

  if (!estObjet(packsJoues)) return 'L\'avancement dans les grilles de la sauvegarde est abîmé.';
  const packsLus: [string, EtatPack][] = [];
  for (const [cle, etat] of Object.entries(packsJoues)) {
    const [jeu = '', niveau, ...reste] = cle.split('/');
    if (!parJeu.has(jeu) || !estNiveau(niveau) || reste.length > 0 || !estEtatPack(etat)) {
      return 'L\'avancement dans les grilles de la sauvegarde est abîmé.';
    }
    packsLus.push([cle, etat]);
  }

  // fromEntries crée de vraies propriétés (aucun risque avec une clé comme « __proto__ », déjà refusée)
  return {
    reglages,
    parties: partiesLues,
    stats: Object.fromEntries(statsLues),
    packsJoues: Object.fromEntries(packsLus),
  };
}
