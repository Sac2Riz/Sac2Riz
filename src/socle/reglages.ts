// RÉGLAGES : complétion des réglages enregistrés par une ancienne version de l'appli. Code pur.
// Les réglages de l'étape 3b n'avaient que le thème et la vérification des erreurs : les
// nouveaux réglages y prennent leur valeur par défaut, sans perdre le thème choisi.

import { REGLAGES_PAR_DEFAUT, type Reglages, type ReglagesEnregistres } from '../types/sauvegarde.ts';

export function completerReglages(enregistres: ReglagesEnregistres | null): Reglages {
  if (enregistres === null) return REGLAGES_PAR_DEFAUT;
  return { ...REGLAGES_PAR_DEFAUT, ...enregistres };
}
