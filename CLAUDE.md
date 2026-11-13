# CLAUDE.md — Sac2Riz

Instructions permanentes pour Claude. À relire au début de chaque session. Le détail est dans `docs/`.

## Objectif
PWA de jeux de logique à chiffres (sudoku et variantes, chiffres casés, Kakuro…), utilisée surtout
sur **tablette Android**, 100 % hors ligne, installable, sans pub ni tracking. Interface en **français**.
Nom affiché : **Sac2Riz**. Dépôt GitHub : `Sac2Riz/Sac2Riz` (public ; son README s'affiche sur la page de profil
GitHub, il doit rester une présentation soignée de l'appli). Appli publiée (GitHub Pages, étape 5) :
https://sac2riz.github.io/Sac2Riz/. Le dossier local s'appelle `sudogame`. Projet au long cours : des jeux
et variantes seront ajoutés régulièrement.

## L'utilisateur
Débute avec Git et TypeScript, travaille sous Windows 11 dans VS Code.
**Expliquer les commandes et notions importantes** au moment où on les utilise.

## Stack (contraintes fermes)
- TypeScript **strict**, HTML, CSS. **Aucun framework, aucun bundler.**
- `tsc` compile `src/` en modules ES natifs dans `dist/`. Les imports s'écrivent **avec l'extension `.ts`**
  (`import { x } from './a.ts'`) ; `rewriteRelativeImportExtensions` les réécrit en `.js`.
  Syntaxe effaçable uniquement (`erasableSyntaxOnly`) : pas d'`enum`, de `namespace`, de propriétés de paramètres.
- Dépendances npm : **dev uniquement**, et seulement :
  - `typescript` (v7, compilateur natif) ;
  - `@types/node` — accepté par l'utilisateur pour typer les tests (`node:test`, `node:assert`) et les scripts.
    Visible **uniquement** de `tests/` et `scripts/` ; le code de l'appli ne voit que DOM / WebWorker (`types: []`).
  - Toute autre dépendance : **demander d'abord en justifiant**. Aucune dépendance de production.
- Tests : `node --test` (Node exécute les `.ts` directement). Node ≥ 22.18.
- Calculs lourds (génération, notation) dans le **Web Worker** (`src/worker/`).
- Stockage : IndexedDB ; export/import JSON validé. Hébergement : GitHub Pages via GitHub Action ; `dist/` jamais commité.

## Commandes
| Commande | Rôle |
|---|---|
| `npm run dev` | dist/ propre + `tsc --watch` + recopie des statiques + serveur http://localhost:8080 (`npm run dev -- --reseau` pour la tablette) |
| `npm run build` | compilation complète dans `dist/` |
| `npm run check` | vérification des types (4 configs) + tests. **À lancer à la fin de chaque étape et avant chaque commit ; tout doit passer.** |
| `npm run typecheck` / `npm test` | les deux moitiés de `check` |
| `npm run test:long` | test de sûreté long du solveur logique (fichiers `tests/**/*.long.ts`, ~30 s, 4100 grilles + couverture des techniques). Hors de `check` ; **à lancer quand on touche au solveur logique** |
| `npm run bench` | mesures : génération / unicité, répartition des niveaux, génération par niveau, force (~85 s ; `--rapide` ~17 s) |
| `npm run packs` | régénère les packs Expert/Diabolique du sudoku classique (~1 min). **À relancer si `VERSION_NOTATION` change** |

## Architecture (résumé → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))
- `src/types/` : **tous** les types partagés. Contrat logique (`jeu.ts`, pur) et contrat d'affichage (`vue.ts`, DOM).
- `src/socle/` : interface commune (accueil, pavé, chrono, historique, réglages, stats, thème…) et services
  (client du worker, stockage `stockage/`, réserve, packs) ; tout ce qui touche au navigateur y est injecté
  pour être testé sous Node.
- `src/moteur/` : moteur de contraintes (régions unicité/somme), backtracking, générateur, solveur logique (`logique/`) :
  une technique par fichier dans `logique/techniques/`, une étape renvoyée **seulement si elle a un effet réel**.
- `src/games/<id>/` : un jeu = un dossier (`meta.ts`, `types.ts`, `logique.ts`, `vue.ts`, `index.ts`, `style.css`, `packs/`).
  **Ajouter un jeu = un dossier + une ligne dans `src/games/registre.ts`**, sans toucher au socle → [docs/AJOUTER_UN_JEU.md](docs/AJOUTER_UN_JEU.md).
- `src/games/_modele/` : module modèle à copier. Dossiers `_xxx` : testés, **jamais publiés**.
- 4 configs TypeScript : `tsconfig.json` (appli, DOM), `src/worker/tsconfig.json` (WebWorker + code pur ; même `rootDir`/`outDir` que l'appli),
  `tests/tsconfig.json`, `scripts/tsconfig.json` (Node).
- Difficulté : 6 niveaux + force 1-10 → [docs/DIFFICULTE.md](docs/DIFFICULTE.md). Notation dans
  `src/moteur/notation.ts` : **incrémenter `VERSION_NOTATION`** si un seuil ou une technique change, puis `npm run packs`.

## Conventions
- Code et commentaires **en français**. Fichiers courts, une responsabilité par fichier.
- Pas de `any`. Pas de désactivation de règle (`@ts-ignore`, `@ts-expect-error`, `!`, `as`) sans commentaire justifiant.
- Types de données JSON (D/E/A, sauvegardes) déclarés avec `type`, pas `interface` ; pas de propriété optionnelle (utiliser `| null`).
- Code pur (types, utils, moteur, `logique.ts`, `meta.ts`) : jamais de DOM ni de Node.
- Fonctions de logique **pures** : jamais de mutation, renvoyer de nouvelles valeurs.
  (Exception admise dans le moteur : tableaux de travail **locaux** modifiés pour la vitesse, jamais les arguments.)
- Classes CSS d'un jeu préfixées par son id ; couleurs via les variables de `src/styles/theme.css`.
- Tests unitaires obligatoires pour le moteur (unicité de solution, validité, cohérence de la notation) et pour chaque technique du solveur.

## Confidentialité (dépôt public)
- Identité Git **locale au dépôt** : `user.name = Sac2Riz`, `user.email = 22239092+Sac2Riz@users.noreply.github.com`.
  Vérifier (`git config user.name` / `git config user.email`) avant de committer ; **jamais le vrai mail**.
- Aucune donnée personnelle (nom réel, mail, chemin absolu Windows) dans le code, la doc ou les messages de commit :
  uniquement des chemins relatifs au projet.
- Aucun secret, clé ou jeton dans le dépôt. Le `.gitignore` exclut node_modules/, dist/, exports `sac2riz-sauvegarde*.json`, `.env*`, fichiers système/éditeur.

## Règles de travail
- **Une étape à la fois** ([docs/ROADMAP.md](docs/ROADMAP.md)) ; attendre le feu vert de l'utilisateur avant la suivante.
- Fin d'étape : `npm run check` vert → mettre à jour **CLAUDE.md** (état), **docs/ROADMAP.md**, **CHANGELOG.md** → commit clair.
- Commit uniquement si `npm run check` passe.
- **Historique Git** : ne jamais le réécrire (`commit --amend`, `rebase`, `reset`, `push --force`…) sans avoir
  d'abord demandé l'autorisation à l'utilisateur en expliquant pourquoi. Et **jamais** sur un commit déjà
  poussé sur GitHub. Pour corriger un commit, en faire un nouveau.

## État d'avancement
- ✅ Étape 0 — Fondations (squelette, outillage, contrat, docs).
- ✅ Étape 1 — Moteur de contraintes (`src/moteur/`), backtracking, générateur, tests, `npm run bench`.
- ✅ Étape 2a — Solveur logique : 21 techniques (Débutant → Diabolique), étapes expliquées, tests de sûreté.
- ✅ Étape 2b — Notation (niveau + force, seuils mesurés), génération par niveau, packs Expert/Diabolique (200 grilles), bench étendu.
- ✅ Étape 3a — Services sans interface : client du worker (budget de temps, annulation), stockage
  (IndexedDB + mémoire, schéma versionné), réserve de grilles, packs, historique, chrono.
- ⏭️ Prochaine : **Étape 3b** — sudoku classique jouable (module, accueil, grille, pavé, notes,
  annuler/rétablir, sauvegarde et reprise). Point à trancher avec l'utilisateur : nouvelle partie sur
  une partie en cours = abandon dans les statistiques ?
