# Module de jeu modèle

Ce dossier sert de **point de départ** pour chaque nouveau jeu. Il implémente
complètement le contrat avec un jeu volontairement trivial (compléter une ligne de 1 à 6).

Le nom commence par `_` : le dossier est **vérifié par les tests** mais **jamais publié**
(exclu de `tsconfig.json`, ignoré par le script de copie, absent du registre).

| Fichier | Rôle | DOM ? |
|---|---|---|
| `meta.ts` | id, nom, description, niveaux, versionFormat, generation (`{}` par défaut), reglages (`[]` par défaut) | non |
| `types.ts` | types D (données), E (état), A (actions) | non |
| `logique.ts` | `export const logique` : génération, notation, règles, gardes | non |
| `vue.ts` | `export const vue` : affichage, saisie et aperçu en lecture seule (fiche du jeu) | oui |
| `fiche.ts` | `export const fiche` : règles et grille d'exemple de la fiche du jeu | non |
| `index.ts` | `export const jeu` : point d'entrée référencé par le registre | non (types seulement) |
| `style.css` | styles du jeu, classes préfixées par l'id | — |
| `packs/` | (facultatif) grilles pré-générées en JSON | — |

Marche à suivre complète : [docs/AJOUTER_UN_JEU.md](../../../docs/AJOUTER_UN_JEU.md).
