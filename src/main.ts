// Point d'entrée de l'application (chargé par index.html).

import { REGISTRE } from './games/registre.ts';
import { afficherAccueil } from './socle/accueil.ts';
import { verifierWorker } from './socle/calculs.ts';
import { appliquerTheme } from './socle/theme.ts';
import { REGLAGES_PAR_DEFAUT } from './types/sauvegarde.ts';

async function demarrer(): Promise<void> {
  appliquerTheme(REGLAGES_PAR_DEFAUT.theme);

  const racine = document.getElementById('app');
  if (racine === null) throw new Error('Élément #app introuvable dans index.html');

  // Charge uniquement les points d'entrée (index.ts) des jeux : métadonnées pour l'accueil
  const jeux = await Promise.all(REGISTRE.map(async (entree) => (await entree.charger()).jeu));
  afficherAccueil(racine, jeux);

  const pret = await verifierWorker();
  console.info(pret ? 'Worker de calcul prêt.' : 'Le worker de calcul ne répond pas.');
}

demarrer().catch((erreur: unknown) => {
  console.error('Erreur au démarrage :', erreur);
});
