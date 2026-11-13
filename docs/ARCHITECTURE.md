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
  - `somme` (forme `cage`) : somme imposée `total` ; si `distinctes` est vrai (règle du Killer,
    valeur par défaut de la fabrique `cage()`), les valeurs de la cage sont aussi toutes différentes :
    une cage de 8 sur deux cases accepte 1+7, 2+6, 3+5, jamais 4+4.
- **Une variante = une déclaration de régions** : sudoku 9x9 = 9 lignes + 9 colonnes + 9 blocs ;
  diagonal = + 2 diagonales ; Windoku = + 4 blocs ; irrégulier = blocs remplacés par des régions
  irrégulières ; Killer = + cages.
- **Candidats** : masque de bits par case (bit v−1 = valeur v possible ; valeurs de 1 à 31).
- **Pureté dans le moteur** : pour la vitesse, le solveur modifie des tableaux de travail **locaux**
  (`Int32Array`), mais ne modifie jamais ses arguments et renvoie toujours de nouvelles valeurs.

```
src/moteur/
├─ candidats.ts        masqueDe, masqueComplet, contient, compterBits, valeursDuMasque, plusPetiteValeur
├─ regions.ts          fabriques : regionsLignes/Colonnes/Blocs/Diagonales/Irregulieres, cage,
│                      regionsClassiques, definitionClassique(taille, hBloc, lBloc)
├─ structure.ts        compiler(def) : vérifie la définition, précalcule les tables du solveur
├─ validation.ts       conflits, estComplete, estSolution (pour erreurs() / estTerminee() des jeux)
├─ backtracking.ts     compterSolutions, compterSolutionsAvec, estUnique
├─ generateur.ts       genererGrilleComplete, retirerChiffres, genererGrille
├─ notation.ts         noterGrille, noterEtapes, calculerForce, SEUILS_FORCE, VERSION_NOTATION (étape 2b)
├─ generation-niveau.ts genererParNiveau, CIBLES_ARRET_TOT (étape 2b)
├─ pack.ts             estPackSudoku (garde), grilleEnTexte, texteEnGrille (étape 2b)
└─ logique/            solveur logique (étape 2a) — voir ci-dessous
   ├─ contexte.ts      creerContexte(def) : cases qui se voient, régions complètes, formes, rangs
   ├─ etat.ts          etatInitial, appliquerEtape, aDesEffets, contradiction, estRemplie
   ├─ noms.ts          « L3C5 », « la ligne 3 », « le bloc 2 », « la diagonale ↘ »… pour les explications
   ├─ technique.ts     types Technique / InfosTechnique / Motif, construireEtape (filtre les effets réels)
   ├─ outils.ts        combinaisons, positions d'un chiffre, liens forts, cases bivaleurs…
   ├─ familles/        logique partagée : singleton-cache, sous-ensembles, intersections, poissons,
   │                   liens-forts, propagation (forcing)
   ├─ techniques/      UNE TECHNIQUE PAR FICHIER (21) + index.ts (liste ordonnée TECHNIQUES)
   └─ solveur.ts       resoudreLogique, prochaineEtape
```

### Solveur logique — `logique/`

- **État** (`EtatLogique`, `src/types/logique.ts`) : `{ valeurs, candidats }` (candidats en masques de bits,
  0 pour une case remplie). Jamais modifié : `appliquerEtape` renvoie un nouvel état. Poser une valeur la
  retire des candidats de toutes les cases qui voient sa case.
- **Technique** : `{ id, niveau, nom, chercher(ctx, etat) }` ; `chercher` renvoie la **première occurrence
  utile** de son motif sous forme d'**`Etape`**, ou `null`. Une étape (JSON) décrit : technique, niveau,
  cases et candidats du motif, régions, placements, éliminations, explication en français. Elle servira
  aux indices expliqués (étape 3).
- **Effet réel obligatoire** : `construireEtape` ne garde que les placements dans des cases vides et les
  éliminations de candidats encore présents ; s'il ne reste rien, elle renvoie `null` et la technique passe
  au motif suivant. Le solveur a un garde-fou : une étape sans effet lève une erreur (au lieu de boucler).
- **Solveur** : `resoudreLogique(ctx, enonce, { niveauMax, techniques })` essaie les techniques dans l'ordre
  et revient à la première après chaque progrès. Résultat `{ statut, etapes, etat, raison }`, statut
  `'resolu'`, `'bloque'` (plus rien ne progresse : essai-erreur nécessaire ou solutions multiples) ou
  `'contradiction'` (énoncé incohérent).
- **Généricité** : les techniques ne connaissent que les régions. Une **région complète** (chiffres distincts
  et autant de cases que de valeurs) contient chaque valeur exactement une fois : singletons cachés,
  sous-ensembles cachés et liens forts n'utilisent que celles-là ; les sous-ensembles nus marchent dans
  toute région distincte (y compris une cage « distinctes »). Les **sommes** des cages ne sont pas encore
  exploitées (techniques Killer à venir avec la variante). Détail par technique : docs/DIFFICULTE.md.

### Solveur par backtracking — `backtracking.ts`

`compterSolutions(def, valeurs, { limite = 2, noeudsMax = ∞, alea = null })` →
`{ nombre, solution, interrompu, noeuds }`. Il remplit d'abord la case qui a le moins de candidats
(heuristique MRV). Pour les cages, une valeur est écartée si la somme restante devient impossible
(bornes min/max des valeurs encore disponibles). `interrompu` signale un arrêt par `noeudsMax`
(`nombre` n'est alors qu'un minimum). Avec `alea`, les valeurs sont essayées au hasard (remplissage).
`compterSolutionsAvec(structure, …)` évite de recompiler la définition dans une boucle.

### Générateur — `generateur.ts`

- `genererGrilleComplete(def, alea)` : grille pleine au hasard.
- `retirerChiffres(def, solution, alea, options)` : vide les cases dans un ordre aléatoire et remet
  celles dont le retrait rendrait la solution non unique. Options (toutes facultatives) :
  - `symetrie` : `'centrale'` (par défaut : la case et sa symétrique par rapport au centre sont vidées
    ensemble) ou `'aucune'` ;
  - `indicesMin` : ne jamais descendre sous ce nombre de chiffres donnés (0 par défaut) ;
  - `accepter` : **fonction d'acceptation** (`null` par défaut), appelée après **chaque retrait réussi**
    (énoncé toujours à solution unique) avec un `EtatRetrait` :
    `{ enonce, solution, nombreIndices, cellulesRetirees }` (`enonce` est une copie). Elle renvoie :
    - `'continuer'` : garder le retrait et poursuivre ;
    - `'refuser'` : remettre les chiffres retirés et passer aux cases suivantes
      (ex. l'énoncé exigerait une technique trop forte pour le niveau visé) ;
    - `'arreter'` : garder le retrait et terminer (ex. Débutant : s'arrêter vers 36-44 chiffres).
- `genererGrille(def, alea, options)` = les deux à la suite → `{ enonce, solution }`.
- Le retrait seul ne fabrique pas de cages : la génération des cages du Killer viendra avec cette variante.

### Notation et génération par niveau — `notation.ts`, `generation-niveau.ts` (étape 2b)

- `noterGrille(ctx, enonce)` → `Notation` (niveau, force, techniqueMax, details) ou `null` si le solveur
  logique est bloqué. `noterEtapes` fait de même à partir d'étapes déjà calculées. Règles et seuils :
  docs/DIFFICULTE.md. **`VERSION_NOTATION`** est à incrémenter dès qu'un seuil ou une technique change.
- `genererParNiveau(def, niveau, alea, { tentativesMax = 50, symetrie = 'centrale', cibleIndices, seuils })`
  → `{ ok: true, enonce, solution, notation, essais }` ou `{ ok: false, raison, essais }`. Chaque essai :
  grille complète, puis `retirerChiffres` dont la fonction d'acceptation **refuse** un retrait si la grille
  n'est plus résoluble avec les techniques du niveau, et **arrête** tôt (Débutant, Facile) quand le nombre
  de chiffres atteint une cible tirée dans `CIBLES_ARRET_TOT`. Contrôle final : niveau exact, sinon essai
  suivant. Le contexte du solveur est calculé une fois par appel.
- Génération Expert/Diabolique : nombre de tentatives limité dans le worker ; si échec, grille tirée du pack.

### Mesure des performances

`npm run bench` (`scripts/bench.ts` + `scripts/bench/`, graines fixes, reproductible ; `--rapide` ou
`--n=<nombre>` pour réduire l'échantillon) affiche :
1. génération de grilles minimales et vérification d'unicité (100 grilles 9x9) ;
2. répartition des niveaux de grilles minimales au hasard (avec et sans symétrie) ;
3. génération par niveau : taux d'échec, essais, temps moyen/max, chiffres donnés (Expert et Diabolique
   avec et sans symétrie ; Débutant et Facile avec et sans arrêt tôt) ;
4. mesures de la force (quartiles du score et des chiffres donnés, part de force haute).

Références PC : voir docs/DIFFICULTE.md (étape 2b) ; moteur seul ~1,3 ms par grille minimale.

## Packs de grilles

`src/games/<id>/packs/<niveau>.json` : `PackSudoku` (`src/types/pack.ts`) =
`{ version, versionNotation, jeu, niveau, grilles: [{ graine, enonce, solution, notation }] }`, grilles en
texte (81 chiffres, 0 = vide), une grille par ligne. Générés par `npm run packs`
(`scripts/generer-packs.ts`, graines 1, 2, 3…, une graine en échec est sautée). La garde `estPackSudoku`
(`src/moteur/pack.ts`) vérifie forme, cohérence énoncé/solution, notation compatible avec le niveau et
**`versionNotation` = `VERSION_NOTATION`** ; les tests vérifient en plus l'unicité, la notation recalculée
et la reproductibilité depuis la graine. **Si `VERSION_NOTATION` change, relancer `npm run packs`.**
Copiés dans `dist/` à côté du module ; chargés par `fetch(new URL('./packs/expert.json', import.meta.url))`.

## PWA (étape 5)

Manifest (`public/manifest.webmanifest`), service worker qui met en cache tous les fichiers de `dist/`
(liste générée au build, versionnée), 100 % hors ligne. Icônes PNG 192 et 512 (dont « maskable »).
