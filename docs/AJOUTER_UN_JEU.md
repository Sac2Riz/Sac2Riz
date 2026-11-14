# Ajouter un jeu

Ajouter un jeu ne demande **aucune modification du socle** : un nouveau dossier + une ligne dans le registre.

Deux jeux ont suivi ce guide : le sudoku classique (famille sudoku, moteur commun) et les chiffres
casés (étape 4, jeu sans régions, avec son propre solveur). La section « Jeu hors de la famille
sudoku » ci-dessous rassemble ce que ce second jeu a appris.

## 1. Choisir l'identifiant

En **kebab-case** (minuscules, chiffres, tirets), ex. `sudoku-diagonal`. Il sert de nom de dossier,
de `meta.id` et de préfixe CSS.

## 2. Copier le modèle

Copier `src/games/_modele/` vers `src/games/<id>/`, puis supprimer `LISEZMOI.md`.

## 3. Adapter chaque fichier

1. **`meta.ts`** : `id` (= nom du dossier), `nom`, `description`, `niveaux`, `versionFormat: 1`,
   `generation: {}`.
   - `generation` règle, niveau par niveau, comment le socle obtient les grilles (`GenerationNiveau`,
     `src/types/jeu.ts`). Un niveau absent est généré dans le worker avec le budget par défaut (4 s).
     `{ mode: 'pack' }` : niveau servi **uniquement** par son pack, jamais généré sur l'appareil (génération
     trop longue pour une tablette). `{ mode: 'worker', budgetFondMs }` : la réalimentation de la réserve en
     arrière-plan dispose d'un budget plus long (la génération urgente garde 4 s ; mettre aussi un pack pour ce
     niveau, servi avant elle). Exemple : `chiffres-cases/meta.ts`.
2. **`types.ts`** : définir D (données de grille), E (état du joueur), A (actions).
   - Toujours `type X = { … }` (pas `interface`), pas de propriété optionnelle (`| null` à la place).
3. **`logique.ts`** : implémenter `LogiqueJeu<D, E, A>` (voir [ARCHITECTURE.md](ARCHITECTURE.md#contrat-des-modules-de-jeu)).
   - Code **pur** : pas de DOM, pas de mutation.
   - Variante de sudoku : utiliser le moteur (`src/moteur/`) ; idéalement, seule la liste de régions change.
   - `generer` doit garantir une solution unique et consulter `doitArreter()` entre deux essais (budget de temps du worker).
   - `noter` : critères du jeu, documentés dans [DIFFICULTE.md](DIFFICULTE.md).
   - Gardes `estDonnees` / `estEtat` / `estAction` strictes : elles protègent l'import de fichiers.
   - `indice(etat, donnees, options)` : renvoie un indice en deux temps (titre, explication, marques à
     mettre en évidence, libellé du bouton, action). Respecter `options.retraitAutoNotes` si le jeu a des notes.
   - `nomTechnique(id)` : nom affiché de `notation.techniqueMax` (écran de fin de partie).
   - Garder l'export `export const logique` (le worker le charge sous ce nom).
4. **`vue.ts`** : implémenter `VueJeu<D, E, A>`. Ne jamais modifier l'état : appeler `contexte.jouer(action)`.
   - **Pavé** (`pave`) : `{ type: 'commun', valeurs: ['1', …] }` (le socle dessine les touches et appelle
     `saisir(valeur)`), ou `{ type: 'personnalise' }` : le socle **confie la zone du pavé à la vue**.
   - **`monter(zones, contexte)`** : `zones.grille` reçoit la grille ; `zones.pave` est la zone du pavé si
     le pavé est personnalisé (la vue y dessine son panneau : liste, boutons…), `null` avec le pavé commun.
     La zone du pavé personnalisé défile si son contenu dépasse ; en portrait elle est sous la grille (hauteur
     bornée pour que la grille reste grande), en paysage dans la colonne de droite. Le socle la masque
     pendant un indice (le bandeau prend sa place) et en pause, et la rend inerte quand le jeu est bloqué.
   - **`outilsMasques`** : outils du socle sans objet pour ce jeu, parmi `'notes'`, `'effacer'`, `'indice'`
     (`[]` = tous ; Annuler et Rétablir restent toujours). Un outil masqué disparaît de la barre (qui se
     répartit sur les outils restants) et son raccourci clavier est désactivé.
     Exemple : `chiffres-cases/vue.ts` (`pave: { type: 'personnalise' }`, `outilsMasques: ['notes']`).
   - Bouton « Effacer » : le socle appelle `effacer()`, la vue sait ce qui est sélectionné.
   - `afficher` reçoit `{ etat, donnees, erreurs, indice }` : dessiner les marques de l'indice quand il
     n'est pas `null`. Relire `contexte.reglages()` à chaque affichage (réglages modifiables en cours de partie).
   - `restants` donne le nombre de fois où chaque valeur du pavé commun peut encore être posée (ou `null`) :
     la touche est estompée à 0, aucun nombre n'est affiché. Avec un pavé personnalisé, renvoyer `null`.
   - La grille doit remplir `zones.grille` (`container-type: size` : utiliser `min(100cqw, 100cqh)` pour
     une grille carrée).
5. **`style.css`** : classes préfixées par l'id, couleurs via les variables de thème.
6. **`index.ts`** : normalement inchangé (`export const jeu = { meta, chargerLogique, chargerVue, chargerPack }`) ;
   `chargerPack` renvoie `null` si le jeu n'a pas de pack (voir `sudoku-classique/packs.ts` sinon).
7. **(facultatif) `packs/<niveau>.json`** : grilles pré-générées (Expert, Diabolique). Obligatoire pour un
   niveau `{ mode: 'pack' }`.
8. **Autres fichiers** : libres. Le dossier peut contenir autant de fichiers et de sous-dossiers que
   nécessaire (`chiffres-cases/` : `grille.ts`, `solveur/techniques/`, `generateur.ts`, `indice.ts`…).
   Seule contrainte : tout ce que `logique.ts` importe est du code pur (il tourne dans le worker).

## 4. Enregistrer le jeu

Dans `src/games/registre.ts`, ajouter **une ligne** :

```ts
{ id: '<id>', charger: () => import('./<id>/index.ts') },
```

## 5. Tester

- Les tests du registre vérifient automatiquement le nouveau jeu (`tests/games/verifier-module.ts`) :
  structure, réglages de génération, génération reproductible, cohérence de la notation, aller-retour
  JSON, partie complète jouée par les indices sans mutation, gardes de type, configuration de la vue
  (outils masqués connus, pavé cohérent avec `restants`). Seuls les niveaux **sans réglage** dans
  `meta.generation` y sont générés ; les niveaux servis par pack ou à budget long se contrôlent dans
  le test long du jeu (`verifierLogique(logique, niveaux)` dans un `*.long.ts`).
- **Avant d'avoir une vue**, la logique seule se contrôle avec `verifierLogique(logique, niveaux)` (même
  fichier) : c'est ce que fait la sous-étape 4a des chiffres casés.
- `npm test` doit rester rapide (< 10 s au total) : un niveau long à générer (plusieurs secondes) est
  contrôlé dans un fichier `*.long.ts` (`npm run test:long`) en passant la liste des niveaux rapides à
  `verifierLogique` dans `npm test`.
- Ajouter `tests/games/<id>.test.ts` (ou un dossier `tests/games/<id>/` si le jeu a beaucoup de fichiers)
  pour les règles propres au jeu.
- `npm run check` doit passer. Essayer dans le navigateur avec `npm run dev`.

## 6. Documenter

- `docs/DIFFICULTE.md` : critères de difficulté du jeu (si ce n'est pas un sudoku standard).
- `CHANGELOG.md`, `docs/ROADMAP.md`, état dans `CLAUDE.md`. Puis commit.

## Jeu hors de la famille sudoku (leçons des chiffres casés)

Le moteur `src/moteur/` (régions, candidats par case, techniques de sudoku) ne sert qu'aux sudokus. Un jeu
d'une autre nature apporte tout dans son dossier, sans toucher au socle :

- **Modèle propre** : les données D restent minimales (ici : la solution et les pré-placés), tout le reste
  (emplacements, croisements, liste de nombres) en est **déduit**. Comme le contrat repasse D à chaque appel,
  la structure déduite est mise en cache dans un `WeakMap` indexé par l'objet D (`structureDe`) : les
  fonctions restent pures, sans recalcul à chaque coup.
- **Solveur logique propre**, organisé comme celui du sudoku : une technique par fichier avec son niveau,
  une étape renvoyée seulement si elle a un effet réel, un garde-fou qui lève une erreur sinon, un test de
  sûreté long (chaque étape comparée à la solution, unicité vérifiée par un backtracking propre au jeu,
  chaque technique utilisée au moins une fois).
- **Notation propre** : mêmes 6 niveaux et même échelle de force, critères du jeu, constante
  `VERSION_NOTATION_<JEU>` à incrémenter si un seuil ou une technique change. Documenter dans DIFFICULTE.md.
- **Calibrage en deux temps** : écrire `scripts/bench/<id>.ts` (branché dans `scripts/bench.ts` par
  `--jeu=<id>`), présenter les mesures et des seuils proposés, ne les figer qu'après validation.
- **Packs** : `PackSudoku` (`src/types/pack.ts`) décrit des grilles de sudoku. Un autre jeu définit son
  format, sa garde et sa conversion en `Puzzle` dans `src/games/<id>/packs.ts` (exemple :
  `chiffres-cases/packs.ts`), ajoute un script `scripts/packs/<id>.ts` déclaré dans
  `scripts/generer-packs.ts` (`npm run packs -- --jeu=<id>`), et des tests (garde, packs embarqués ;
  vérification complète des grilles dans un `*.long.ts`).
- **Indices et erreurs** : le contrat parle de **cases** (`erreurs` renvoie des numéros de cases, les
  marques d'un indice sont des cases et des chiffres). Un jeu qui raisonne sur autre chose (ici des
  emplacements et des nombres entiers) traduit : marques = cases de l'emplacement et leurs chiffres,
  erreurs = cases des emplacements faux. Une action peut agir sur plusieurs cases à la fois (`placer` un
  nombre entier).
- **Génération lente** : la génération doit consulter `doitArreter()` souvent (ici entre deux pas d'une
  marche aléatoire, pas seulement entre deux essais complets). Si un niveau ne tient pas dans le budget
  d'une tablette, le déclarer `{ mode: 'pack' }` dans `meta.generation`.
- **Interface** (étape 4b) : le pavé commun est fait pour poser des chiffres. Un jeu qui pose autre chose
  (ici des nombres entiers) choisit `{ type: 'personnalise' }` et dessine son panneau dans `zones.pave`
  (voir l'étape 3, point 4) ; il masque les outils sans objet (`outilsMasques: ['notes']`).
- **Logique des touchers à part** : la vue ne fait que dessiner et transmettre les touchers ; ce que produit
  chaque toucher (nouvelle sélection, action à jouer, éléments à mettre en évidence) est calculé par des
  fonctions pures (`chiffres-cases/interaction.ts`), testées sous Node comme le reste du jeu.
- **Signal visuel d'une conséquence** : quand une action en modifie d'autres (nombre déplacé, nombres
  croisés retirés), la logique fournit une fonction qui les décrit **avant** l'action
  (`consequencesPlacement`) ; la vue la consulte juste avant `contexte.jouer` et anime brièvement les
  cases concernées (sans animation si `prefers-reduced-motion`).
- **Grille non carrée** : la vue donne à sa grille les proportions `--l / --h` et la largeur
  `min(100cqw, 100cqh × l / h)` ; couleur des cases noires : `--couleur-case-noire`.

## Si le format d'un jeu change plus tard

Incrémenter `meta.versionFormat` et implémenter `migrer(ancien, versionOrigine)` pour que les parties
sauvegardées et les exports anciens restent lisibles.
