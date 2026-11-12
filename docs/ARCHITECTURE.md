# Architecture

## Vue d'ensemble

```
┌──────────────────────────── Page (DOM) ────────────────────────────┐
│ main.ts → socle/ (accueil, partie, pavé, chrono, historique,       │
│           réglages, stats, thème, stockage IndexedDB)              │
│              │ registre.ts → games/<id>/index.ts                   │
│              │      ├─ chargerLogique() → logique.ts  (pur)        │
│              │      └─ chargerVue()     → vue.ts      (DOM)        │
│              │                                                     │
│              └─ postMessage ───────────┐                           │
└────────────────────────────────────────┼───────────────────────────┘
                                         ▼
┌──────────────────────── Web Worker (pas de DOM) ───────────────────┐
│ worker/generation.ts → games/<id>/logique.js → moteur/             │
│ génération, notation de difficulté                                 │
└────────────────────────────────────────────────────────────────────┘
```

Trois mondes, trois jeux de types :

| Monde | Fichiers | Types visibles | Configuration |
|---|---|---|---|
| Page | `src/**` sauf `worker/` et `_xxx/` | ES2023 + DOM | `tsconfig.json` |
| Worker | `src/worker/**` + code pur (types sauf `vue.ts`, utils, moteur, `games/*/meta.ts` et `logique.ts`) | ES2023 + WebWorker | `src/worker/tsconfig.json` |
| Node | `tests/**`, `scripts/**` | ES2023 (+ DOM pour les tests) + `@types/node` | `tests/tsconfig.json`, `scripts/tsconfig.json` |

Les deux premières ont **le même `rootDir` (`src`) et le même `outDir` (`dist`)** : le code partagé
est compilé au même endroit (et à l'identique) par les deux. La config du worker sert aussi de garde-fou :
si du code « pur » utilisait le DOM, elle échouerait.

**Code pur** = `src/types/` (sauf `vue.ts`), `src/utils/`, `src/moteur/`, `games/*/meta.ts`, `types.ts`,
`logique.ts` : ni DOM, ni Node, fonctions sans effet de bord.

## Compilation et fichiers

- `tsc` compile chaque `src/x/y.ts` en `dist/x/y.js` (+ `.js.map`). Les imports `.ts` deviennent `.js`.
- `scripts/copier-statiques.ts` copie `public/**` à la racine de `dist/`, et les fichiers non TypeScript de
  `src/` (`.css`, `.json`, images) au même chemin relatif. Les dossiers `_xxx` ne sont jamais copiés.
- Tous les chemins sont **relatifs** (`./main.js`, `new URL('./x', import.meta.url)`) : l'appli marche
  dans un sous-dossier (`https://<compte>.github.io/sudogame/`).

## Socle commun (`src/socle/`, étape 3)

Le socle gère tout ce qui est commun, pour tous les jeux :

- **Accueil** : liste des jeux (depuis le registre), bouton « Continuer », choix du niveau.
- **Partie** : monte la vue du jeu, gère le **pavé** commun (si `vue.pave.type === 'commun'`), le **mode notes**,
  **effacer**, **annuler/rétablir illimité**, **chronomètre** avec pause, **indices** avec compteur,
  **vérification des erreurs** (si activée dans les réglages).
- **Historique** : la partie est la liste des actions `A` + un curseur. L'état courant = `etatInitial` puis
  `appliquer` de chaque action jusqu'au curseur (instantanés gardés en mémoire pour la rapidité).
  Annuler = curseur − 1 ; rétablir = curseur + 1 ; une nouvelle action efface les actions après le curseur.
- **Sauvegarde automatique** (IndexedDB) après chaque action : `PartieSauvegardee` (`src/types/sauvegarde.ts`).
- **Statistiques** par jeu et par niveau : parties terminées, meilleur temps, temps moyen, force moyenne (`StatsNiveau`).
- **Export/import** de toutes les données (`FichierExport`, fichier `sac2riz-sauvegarde-AAAA-MM-JJ.json`) ;
  à l'import, chaque champ est validé (gardes de type des jeux pour D/E/A).
- **Thème** clair/sombre : suit le système par défaut (`prefers-color-scheme`), forçable par `data-theme`.
- **Réserve de grilles** : 2-3 grilles d'avance par jeu et par niveau, en IndexedDB, réalimentées par le worker
  pour un démarrage instantané. Repli sur les **packs JSON embarqués** du jeu (Expert, Diabolique).

## Contrat des modules de jeu

Défini dans `src/types/jeu.ts` (logique, pur) et `src/types/vue.ts` (affichage, DOM). Chaque jeu choisit
trois types JSON : **D** (données de la grille : énoncé, solution), **E** (état de saisie du joueur),
**A** (action du joueur).

### `LogiqueJeu<D, E, A>` — fichier `logique.ts`, `export const logique`

| Membre | Rôle |
|---|---|
| `meta` | `MetaJeu` : id (= dossier), nom, description, niveaux, `versionFormat` |
| `generer(niveau, alea, { tentativesMax })` | `{ ok: true, donnees, notation }` ou `{ ok: false, raison }` (exécuté dans le worker) |
| `noter(donnees)` | `Notation` (niveau, force, technique max, détails) ou `null` si l'essai-erreur est nécessaire |
| `etatInitial(donnees)` | état E en début de partie |
| `appliquer(etat, action, donnees)` | **nouvel** état (jamais de mutation) |
| `erreurs(etat, donnees)` | cases fausses |
| `estTerminee(etat, donnees)` | grille complète et juste |
| `indice(etat, donnees)` | `{ action, explication, cellules }` ou `null` |
| `estDonnees` / `estEtat` / `estAction` | gardes de type pour relire sauvegardes et imports |
| `migrer?(ancien, version)` | facultatif : conversion d'un ancien format |

Le worker enveloppe le résultat de `generer` dans un `Puzzle` (`jeu`, `graine`, `notation`, `donnees`).
`alea` est un générateur **à graine** (`src/utils/alea.ts`) : même graine → même grille.

### `VueJeu<D, E, A>` — fichier `vue.ts`, `export const vue`

- `pave` : `{ type: 'commun', valeurs: ['1', …] }` pour le pavé du socle, ou `{ type: 'personnalise' }`
  (ex. chiffres casés, qui affiche sa propre liste de nombres).
- `monter(conteneur, contexte)` → `InstanceVue` : `afficher(etat, donnees, erreurs)`, `saisir(valeur)`, `effacer()`, `detruire()`.
- La vue ne modifie jamais l'état : elle appelle `contexte.jouer(action)` ; le socle rappelle `afficher`.
- Elle charge son CSS avec `chargerFeuilleDeStyle(new URL('./style.css', import.meta.url))`.

### `ModuleJeu` — fichier `index.ts`, `export const jeu`

`{ meta, chargerLogique, chargerVue }` : l'accueil ne charge que les métadonnées ; logique et vue sont
importées à la demande (`import()` dynamique).

### Registre — `src/games/registre.ts`

Une ligne par jeu : `{ id: 'sudoku-classique', charger: () => import('./sudoku-classique/index.ts') }`.
Les tests (`tests/games/registre.test.ts`) vérifient automatiquement chaque jeu enregistré.

### Worker

Messages typés dans `src/types/worker.ts`. Le worker charge `../games/<id>/logique.js` par convention
(id validé en kebab-case) : il ne dépend ni du registre ni du DOM.

## Moteur de contraintes (famille sudoku, étapes 1-2)

Types dans `src/types/grille.ts`.

- **Grille** = `DefinitionGrille` : dimensions, valeurs autorisées, liste de **régions typées** :
  - `unicite` (formes `ligne`, `colonne`, `bloc`, `diagonale`, `irreguliere`) : chaque valeur au plus une fois ;
  - `somme` (forme `cage`) : somme imposée (+ unicité dans la cage pour le Killer).
- **Une variante = une déclaration de régions** : sudoku 9x9 = 9 lignes + 9 colonnes + 9 blocs ;
  diagonal = + 2 diagonales ; Windoku = + 4 blocs ; irrégulier = blocs remplacés par des régions
  irrégulières ; Killer = + cages. Des fabriques (`regionsClassiques(9, 3, 3)`…) éviteront les répétitions.
- **Candidats** : masque de bits par case (bit v−1 = valeur v possible).
- Le moteur fournit :
  1. **solveur par backtracking** : compte les solutions (arrêt à 2) → vérification d'unicité ;
  2. **générateur** : grille complète aléatoire puis retrait de chiffres (ordre aléatoire, éventuellement
     symétrique) tant que la solution reste unique ;
  3. **solveur logique** (étape 2) : résout comme un humain, techniques de la plus simple à la plus
     complexe, pour noter la difficulté (voir [DIFFICULTE.md](DIFFICULTE.md)). Une technique = un fichier
     dans `src/moteur/logique/techniques/` avec son niveau et ses tests.
- Génération Expert/Diabolique : nombre de tentatives limité dans le worker ; si échec, grille tirée du pack.

Arborescence prévue :

```
src/moteur/
├─ regions.ts          fabriques de régions (lignes, colonnes, blocs, diagonales…)
├─ candidats.ts        opérations sur les masques de bits
├─ backtracking.ts     comptage de solutions
├─ generateur.ts       grille complète + retrait de chiffres
└─ logique/
   ├─ solveur.ts       boucle : applique les techniques dans l'ordre
   ├─ notation.ts      calcul niveau + force
   └─ techniques/      une technique par fichier (singleton-nu.ts, paire-nue.ts, x-wing.ts…)
```

## Packs de grilles

`src/games/<id>/packs/<niveau>.json` : tableau de `Puzzle<D>` pré-générés (via un script de génération).
Copiés dans `dist/` à côté du module ; chargés par `fetch(new URL('./packs/expert.json', import.meta.url))`.

## PWA (étape 5)

Manifest (`public/manifest.webmanifest`), service worker qui met en cache tous les fichiers de `dist/`
(liste générée au build, versionnée), 100 % hors ligne. Icônes PNG 192 et 512 (dont « maskable »).
