# Ajouter un jeu

Ajouter un jeu ne demande **aucune modification du socle** : un nouveau dossier + une ligne dans le registre.

## 1. Choisir l'identifiant

En **kebab-case** (minuscules, chiffres, tirets), ex. `sudoku-diagonal`. Il sert de nom de dossier,
de `meta.id` et de préfixe CSS.

## 2. Copier le modèle

Copier `src/games/_modele/` vers `src/games/<id>/`, puis supprimer `LISEZMOI.md`.

## 3. Adapter chaque fichier

1. **`meta.ts`** : `id` (= nom du dossier), `nom`, `description`, `niveaux`, `versionFormat: 1`.
2. **`types.ts`** : définir D (données de grille), E (état du joueur), A (actions).
   - Toujours `type X = { … }` (pas `interface`), pas de propriété optionnelle (`| null` à la place).
3. **`logique.ts`** : implémenter `LogiqueJeu<D, E, A>` (voir [ARCHITECTURE.md](ARCHITECTURE.md#contrat-des-modules-de-jeu)).
   - Code **pur** : pas de DOM, pas de mutation.
   - Variante de sudoku : utiliser le moteur (`src/moteur/`) ; idéalement, seule la liste de régions change.
   - `generer` doit garantir une solution unique et respecter `tentativesMax`.
   - `noter` : critères du jeu, documentés dans [DIFFICULTE.md](DIFFICULTE.md).
   - Gardes `estDonnees` / `estEtat` / `estAction` strictes : elles protègent l'import de fichiers.
   - Garder l'export `export const logique` (le worker le charge sous ce nom).
4. **`vue.ts`** : implémenter `VueJeu<D, E, A>`. Choisir le pavé commun ou `{ type: 'personnalise' }`.
   Ne jamais modifier l'état : appeler `contexte.jouer(action)`.
5. **`style.css`** : classes préfixées par l'id, couleurs via les variables de thème.
6. **`index.ts`** : normalement inchangé (`export const jeu = { meta, chargerLogique, chargerVue }`).
7. **(facultatif) `packs/<niveau>.json`** : grilles pré-générées (Expert, Diabolique).

## 4. Enregistrer le jeu

Dans `src/games/registre.ts`, ajouter **une ligne** :

```ts
{ id: '<id>', charger: () => import('./<id>/index.ts') },
```

## 5. Tester

- Les tests du registre vérifient automatiquement le nouveau jeu (`tests/games/verifier-module.ts`) :
  structure, génération reproductible pour chaque niveau, cohérence de la notation, aller-retour JSON,
  partie complète jouée par les indices sans mutation, gardes de type.
- Ajouter `tests/games/<id>.test.ts` pour les règles propres au jeu.
- `npm run check` doit passer. Essayer dans le navigateur avec `npm run dev`.

## 6. Documenter

- `docs/DIFFICULTE.md` : critères de difficulté du jeu (si ce n'est pas un sudoku standard).
- `CHANGELOG.md`, `docs/ROADMAP.md`, état dans `CLAUDE.md`. Puis commit.

## Si le format d'un jeu change plus tard

Incrémenter `meta.versionFormat` et implémenter `migrer(ancien, versionOrigine)` pour que les parties
sauvegardées et les exports anciens restent lisibles.
