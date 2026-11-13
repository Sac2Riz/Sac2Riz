// Singleton caché dans un bloc (Débutant) : dans un bloc, un chiffre n'a plus qu'une place
// possible (trouvable par simple balayage des lignes et colonnes). Les régions irrégulières
// jouent le rôle des blocs. Sur une grille sans blocs, cette technique ne se déclenche jamais. Code pur.

import { chercherSingletonCache } from '../familles/singleton-cache.ts';
import type { InfosTechnique, Technique } from '../technique.ts';

const infos: InfosTechnique = { id: 'singleton-cache-bloc', niveau: 'debutant', nom: 'Singleton caché (bloc)' };

export const singletonCacheBloc: Technique = {
  ...infos,
  chercher: (ctx, etat) => chercherSingletonCache(infos, ctx, etat, ['bloc', 'irreguliere']),
};
