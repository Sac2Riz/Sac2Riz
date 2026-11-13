// Demande au navigateur un stockage « persistant » : sans cela, Android peut effacer les
// données d'un site (parties, statistiques…) quand la place manque. Le navigateur peut refuser
// (ou ne pas proposer cette fonction) : l'appli marche alors quand même, on le note seulement.

import type { Journal } from '../environnement.ts';

/** Partie de navigator.storage utilisée ici (fournie par les tests sous une forme factice). */
export type GestionnaireStockage = { persist(): Promise<boolean> };

/** Résultat : vrai = accordé, faux = refusé, null = fonction indisponible ou erreur. */
export async function demanderStockagePersistant(
  gestionnaire: GestionnaireStockage | null,
  journal: Journal,
): Promise<boolean | null> {
  if (gestionnaire === null) {
    journal('Stockage persistant : non proposé par ce navigateur.');
    return null;
  }
  try {
    const accorde = await gestionnaire.persist();
    journal(accorde ? 'Stockage persistant : accordé.' : 'Stockage persistant : refusé (données effaçables).');
    return accorde;
  } catch (erreur) {
    journal(`Stockage persistant : erreur (${erreur instanceof Error ? erreur.message : String(erreur)}).`);
    return null;
  }
}
