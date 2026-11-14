# Ajouter un jeu

Ajouter un jeu ne demande **aucune modification du socle** : un nouveau dossier + une ligne dans le registre.

Trois jeux ont suivi ce guide : le sudoku classique (famille sudoku, moteur commun), les chiffres
casés (étape 4, jeu sans régions, avec son propre solveur) et le Tectonic (étape 7, moteur commun étendu
d'un domaine par case). Les sections « Jeu hors de la famille sudoku » et « Jeu de la famille sudoku qui
n'est pas un sudoku » ci-dessous rassemblent ce que ces deux jeux ont appris.

## 1. Choisir l'identifiant

En **kebab-case** (minuscules, chiffres, tirets), ex. `sudoku-diagonal`. Il sert de nom de dossier,
de `meta.id` et de préfixe CSS.

## 2. Copier le modèle

Copier `src/games/_modele/` vers `src/games/<id>/`, puis supprimer `LISEZMOI.md`.

## 3. Adapter chaque fichier

1. **`meta.ts`** : `id` (= nom du dossier), `nom`, `description` (courte : une phrase, affichée sur
   l'accueil et la fiche du jeu), `niveaux`, `versionFormat: 1`, `generation: {}`, `reglages: []`.
   - `generation` règle, niveau par niveau, comment le socle obtient les grilles (`GenerationNiveau`,
     `src/types/jeu.ts`). Un niveau absent est généré dans le worker avec le budget par défaut (4 s).
     `{ mode: 'pack' }` : niveau servi **uniquement** par son pack, jamais généré sur l'appareil (génération
     trop longue pour une tablette). `{ mode: 'worker', budgetFondMs }` : la réalimentation de la réserve en
     arrière-plan dispose d'un budget plus long (la génération urgente garde 4 s ; mettre aussi un pack pour ce
     niveau, servi avant elle). Exemple : `chiffres-cases/meta.ts`.
   - `reglages` : **les réglages propres au jeu** (étape 6a). Le socle les affiche tout seul dans la section
     « Par jeu » de l'écran des réglages (sous le nom du jeu), les enregistre et les transmet au jeu. Chaque
     réglage est un `ReglageJeu` (`src/types/jeu.ts`) exporté par `meta.ts` pour être relu ailleurs :
     ```ts
     export const RETRAIT_AUTO_NOTES: ReglageJeu = {
       id: 'retraitAutoNotes',          // camelCase, unique dans le jeu ; ne plus le changer (clé enregistrée)
       type: 'interrupteur',            // seul type pour l'instant (oui / non)
       libelle: 'Retrait automatique des notes',
       detail: 'Poser un chiffre le retire des notes de sa ligne, de sa colonne et de son bloc.',
       defaut: true,
       preparation: false,              // true : change la grille d'une NOUVELLE partie (voir preparer)
     };
     ```
     Pour lire sa valeur : `estActif(reglages, RETRAIT_AUTO_NOTES)` (`src/utils/reglages-jeu.ts`), avec les
     valeurs reçues par `indice`, `preparer` ou `contexte.reglages().jeu` (toujours complètes : la valeur par
     défaut remplace un réglage jamais changé). Les réglages **communs à tous les jeux** (vérification des
     erreurs, mise en évidence) ne se déclarent pas : le socle les gère, la vue lit `contexte.reglages()`.
     Exemples : `sudoku-classique/meta.ts` (`RETRAIT_AUTO_NOTES`), `chiffres-cases/meta.ts` (`NOMBRE_AU_DEPART`).
2. **`types.ts`** : définir D (données de grille), E (état du joueur), A (actions).
   - Toujours `type X = { … }` (pas `interface`), pas de propriété optionnelle (`| null` à la place).
3. **`logique.ts`** : implémenter `LogiqueJeu<D, E, A>` (voir [ARCHITECTURE.md](ARCHITECTURE.md#contrat-des-modules-de-jeu)).
   - Code **pur** : pas de DOM, pas de mutation.
   - Variante de sudoku : utiliser le moteur (`src/moteur/`) ; idéalement, seule la liste de régions change.
   - `generer` doit garantir une solution unique et consulter `doitArreter()` entre deux essais (budget de temps du worker).
   - `noter` : critères du jeu, documentés dans [DIFFICULTE.md](DIFFICULTE.md).
   - Gardes `estDonnees` / `estEtat` / `estAction` strictes : elles protègent l'import de fichiers.
   - `indice(etat, donnees, reglages)` : renvoie un indice en deux temps (titre, explication, marques à
     mettre en évidence, libellé du bouton, action). Respecter les réglages du jeu qui changent les actions
     (sudoku : `estActif(reglages, RETRAIT_AUTO_NOTES)`).
   - `nomTechnique(id)` : nom affiché de `notation.techniqueMax` (écran de fin de partie).
   - `preparer(donnees, reglages)` : données d'une **nouvelle** partie ajustées selon les réglages du jeu
     marqués `preparation: true` (chiffres casés : `NOMBRE_AU_DEPART`, aide au départ). Le socle ne l'appelle
     que si l'un d'eux est activé. Jeu sans objet : `preparer: (donnees) => donnees`. Exécuté dans le worker
     (peut noter la grille plusieurs fois), jamais sur une partie en cours ; la grille doit rester à solution
     unique. Exemple : `chiffres-cases/depart.ts`.
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
     n'est pas `null`. Relire `contexte.reglages()` à chaque affichage (réglages modifiables en cours de
     partie) : `miseEnEvidence` (commun) et `jeu` (réglages du jeu).
   - **`apercu(conteneur, { donnees, etat })`** (fiche du jeu et carte du jeu sur l'accueil) : dessiner la
     grille **en lecture seule**, sans écouteur ni clavier, sans sélection ni mise en évidence. Le conteneur
     est petit (≈ 20rem de côté sur la fiche, 11rem de haut sur l'accueil, fond `--couleur-fond`) et
     dimensionné par le socle comme la zone de grille d'une partie (`container-type: size`) : la même CSS que
     la grille jouée convient. Le socle rend le conteneur inerte et le vide ensuite (rien à libérer). Le plus
     simple : réutiliser la fonction qui crée le plateau de `monter` et n'y écrire que les chiffres.
     Exemples : `sudoku-classique/vue.ts`, `chiffres-cases/vue.ts` (grille seule, sans la liste).
   - `restants` donne le nombre de fois où chaque valeur du pavé commun peut encore être posée (ou `null`) :
     la touche est estompée à 0, aucun nombre n'est affiché. Avec un pavé personnalisé, renvoyer `null`.
   - La grille doit remplir `zones.grille` (`container-type: size` : utiliser `min(100cqw, 100cqh)` pour
     une grille carrée).
5. **`fiche.ts`** (étape 6a) : le contenu de la **fiche du jeu**, `export const fiche: FicheJeu<D, E>`
   (code pur, chargé à l'ouverture de la fiche). La fiche affiche, dans cet ordre : `meta.nom`,
   `meta.description`, l'aperçu (la partie en cours, sinon l'exemple, dessinés par `vue.apercu`),
   « Continuer » / « Nouvelle partie » (gérés par le socle), puis les règles.
   - `regles` : les règles **expliquées simplement**, une phrase par point (3 à 5 points), dans l'ordre de
     lecture : but, contrainte, unicité de la solution, comment jouer si ce n'est pas évident.
   - `exemple: { donnees, etat }` : une petite grille facile, **en partie remplie** (pas terminée, sans
     erreur). Le plus sûr : partir de `logique.etatInitial(donnees)` et jouer quelques coups conseillés par
     `logique.indice` (exemples : `sudoku-classique/fiche.ts`, `chiffres-cases/fiche.ts`). Les tests la
     passent aux gardes `estDonnees` / `estEtat`.
6. **`style.css`** : classes préfixées par l'id, couleurs via les variables de thème.
7. **`index.ts`** : normalement inchangé (`export const jeu = { meta, chargerLogique, chargerVue, chargerFiche, chargerPack }`) ;
   `chargerPack` renvoie `null` si le jeu n'a pas de pack (voir `sudoku-classique/packs.ts` sinon).
8. **(facultatif) `packs/<niveau>.json`** : grilles pré-générées (Expert, Diabolique). Obligatoire pour un
   niveau `{ mode: 'pack' }`.
9. **Autres fichiers** : libres. Le dossier peut contenir autant de fichiers et de sous-dossiers que
   nécessaire (`chiffres-cases/` : `grille.ts`, `solveur/techniques/`, `generateur.ts`, `indice.ts`…).
   Seule contrainte : tout ce que `logique.ts` importe est du code pur (il tourne dans le worker).

## 4. Enregistrer le jeu

Dans `src/games/registre.ts`, ajouter **une ligne** :

```ts
{ id: '<id>', charger: () => import('./<id>/index.ts') },
```

## 5. Tester

- Les tests du registre vérifient automatiquement le nouveau jeu (`tests/games/verifier-module.ts`) :
  structure (dont `fiche.ts`), réglages de génération, **réglages déclarés** (identifiants uniques en
  camelCase, textes, valeurs par défaut), génération reproductible, cohérence de la notation, aller-retour
  JSON, partie complète jouée par les indices sans mutation, `preparer` (réglages `preparation` inactifs :
  même objet ; actifs : grille valide), gardes de type, configuration de la vue (outils masqués connus, pavé
  cohérent avec `restants`, `apercu` présent), **fiche** (règles non vides, exemple valide, ni terminé ni faux). Seuls les niveaux **sans réglage** dans
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
- **Pose en un seul toucher** : le toucher qui pose joue l'action tout de suite (le socle enregistre le
  coup, sauvegarde et contrôle la fin) **et lève la sélection**. Une sélection qui reste active après la
  pose fait croire à un aperçu à confirmer (correction de la 4b).
- **Refus expliqué** : un coup interdit par les règles (ici : nombre qui contredit un nombre croisé) est
  sans effet dans `appliquer` ; la logique fournit une fonction qui le dit **avant** l'action, avec la
  raison (`consequencesPlacement` : cases en conflit, ou cases quittées par un nombre déplacé).
  `interaction.ts` en tire un signal (`Reaction.signal`) que la vue anime brièvement : clignotement des
  cases en conflit, ou signal des cases quittées (contour fixe si `prefers-reduced-motion`). Vérifier que
  l'indice ne propose jamais un coup refusé (le test du contrat joue des parties entières par les indices).
- **Grille non carrée** : la vue donne à sa grille les proportions `--l / --h` et la largeur
  `min(100cqw, 100cqh × l / h)`. Cases noires : `--couleur-case-noire`, qui pointe sur le fond de l'appli
  (`var(--couleur-fond)`) ; la forme de la grille est dessinée par le contour des cases blanches.

## Jeu de la famille sudoku qui n'est pas un sudoku (leçons du Tectonic, étape 7a)

Un jeu de chiffres dans des cases, avec des contraintes « chiffres différents », se décrit souvent avec le
moteur même s'il n'a ni lignes ni colonnes :

- **Tout exprimer en régions** : une contrainte « ces cases ont des chiffres différents » est une région
  d'unicité ; une région qui contient forcément chacune de ses valeurs est **complète** (déduit tout seul :
  autant de cases que de valeurs possibles). Une contrainte de voisinage se ramène à de petites régions
  (Tectonic : les carrés 2×2 pour « deux cases qui se touchent »). Forme nouvelle → l'ajouter à
  `FormeUnicite` et lui donner un nom dans `moteur/logique/noms.ts`.
- **Domaine par case** (`DefinitionGrille.domaines`) quand toutes les cases n'acceptent pas les mêmes
  valeurs (Tectonic : 1 à N selon la zone) ; `null` sinon.
- **Sa propre liste de techniques** : reprendre celles du moteur qui valent pour le jeu, en ajouter de
  génériques dans `moteur/logique/techniques/` (sans les mettre dans `TECHNIQUES`, la liste du sudoku, dont
  l'ordre fixe sa notation), déclarer leurs identifiants dans `IDS_TECHNIQUES_COMPLEMENTAIRES`, puis passer
  la liste au solveur (`techniques`) et l'ordre à `noterEtapes`. Les techniques fondées sur les lignes et
  les colonnes ne se déclenchent pas sans ces régions : les retirer de la liste plutôt que les laisser
  tourner pour rien.
- **Une constante de notation propre** (`VERSION_NOTATION_TECTONIC`) : `VERSION_NOTATION` reste celle du sudoku.
- **Données D minimales** (carte des zones, énoncé, solution) et structure déduite en cache (`WeakMap`),
  comme les chiffres casés.
- **Grille pleine** : si « tirer la forme au hasard puis remplir » échoue presque toujours (Tectonic : moins
  de 1 % des découpages 9 × 9 se remplissent), construire la forme et les chiffres ensemble
  (`tectonic/construction.ts`).
- **Tests** : le test de sûreté du moteur (`verifierGrille` de `tests/moteur/logique/surete-commun.ts`)
  accepte la liste de techniques du jeu ; les sudokus doivent rester inchangés (tests existants, packs
  re-notés à l'identique, `npm run test:long`).

## Si le format d'un jeu change plus tard

Incrémenter `meta.versionFormat` et implémenter `migrer(ancien, versionOrigine)` pour que les parties
sauvegardées et les exports anciens restent lisibles.

## Hors ligne et export (étape 5)

Rien à faire : tous les fichiers du jeu copiés dans `dist/` (modules, `style.css`, `packs/`) sont mis en
cache par le service worker au build suivant, et ses parties, statistiques et avancement dans les packs font
partie de l'export (l'import rejoue chaque partie avec les gardes du jeu).
