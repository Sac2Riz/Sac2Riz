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
  dans un sous-dossier (`https://sac2riz.github.io/Sac2Riz/`, dépôt `Sac2Riz/Sac2Riz`).

## Socle commun (`src/socle/`, étape 3)

Le socle gère tout ce qui est commun, pour tous les jeux :

- **Accueil** : liste des jeux (depuis le registre), bouton « Continuer », choix du niveau.
- **Partie** : monte la vue du jeu, gère le **pavé** commun (si `vue.pave.type === 'commun'`), le **mode notes**,
  **effacer**, **annuler/rétablir illimité**, **chronomètre** avec pause, **indices** avec compteur,
  **vérification des erreurs** (si activée dans les réglages).
- **Historique** : la partie est la liste des actions `A` + un curseur. L'état courant = `etatInitial` puis
  `appliquer` de chaque action jusqu'au curseur.
  Annuler = curseur − 1 ; rétablir = curseur + 1 ; une nouvelle action efface les actions après le curseur.
- **Sauvegarde automatique** (IndexedDB) après chaque action : `PartieSauvegardee` (`src/types/sauvegarde.ts`).
- **Statistiques** par jeu et par niveau : parties terminées, meilleur temps, temps moyen, force moyenne,
  et un compteur séparé de parties **abandonnées** (`StatsNiveau`). Meilleur temps et moyennes ne portent que
  sur les parties terminées.
- **Nouvelle partie alors qu'une partie est en cours sur ce jeu** : confirmation ; si le joueur confirme et
  qu'une grille est obtenue, l'ancienne partie compte comme abandonnée puis est remplacée (s'il annule le
  chargement, elle reste intacte).
- **Export/import** de toutes les données (`FichierExport`, fichier `sac2riz-sauvegarde-AAAA-MM-JJ.json`) ;
  à l'import, chaque champ est validé (gardes de type des jeux pour D/E/A).
- **Thème** clair/sombre : suit le système par défaut (`prefers-color-scheme`), forçable par `data-theme`.
  Choix Automatique / Clair / Sombre dans l'écran des réglages ; la couleur de la barre d'état d'Android
  suit le thème choisi (`src/socle/theme.ts`).
- **Réglages** (`Reglages`) : thème, vérification des erreurs, mise en évidence, retrait automatique des
  notes. Écran en fenêtre (`<dialog>`) ouvert depuis l'accueil et pendant une partie ; chaque changement
  s'applique tout de suite. Des réglages enregistrés par une version plus ancienne (forme `ReglagesV1`)
  sont complétés par les valeurs par défaut à la lecture (`socle/reglages.ts`, `completerReglages`).
- **Indices en deux temps** avec compteur : 1) mise en évidence (régions, cases et candidats du motif,
  éliminations barrées, chiffre à placer) et explication dans un bandeau qui remplace le pavé — le compteur
  augmente dès ce moment ; 2) « Appliquer » joue l'action de l'indice (annulable comme tout coup).
- **Fin de partie** : écran de bilan (temps, niveau, force, technique la plus difficile, indices, record).
  Une partie terminée **avec indices** compte dans les statistiques mais **ne peut pas battre le record**.
- **Réserve de grilles** : 3 grilles d'avance par jeu et par niveau, en IndexedDB, réalimentées par le worker
  pour un démarrage instantané. Repli sur les **packs JSON embarqués** du jeu (Expert, Diabolique).

### Services du socle (étape 3a, sans interface, testés sous Node)

Tout ce qui dépend du navigateur est **injecté** (fabrique du worker, base IndexedDB, minuteur
`Programmer`, horloge, `Journal`, document pour la visibilité, chargeur de packs) : les tests fournissent
des versions factices (`tests/socle/aide.ts` : horloge qu'on avance à la main, faux worker, faux générateur).

```
src/socle/
├─ environnement.ts   types Programmer / Annulation / Journal + versions réelles (setTimeout, console)
├─ client-worker.ts   client typé du worker (file à priorités, annulation, garde-fou)
├─ calculs.ts         fabrique du VRAI worker (new Worker) + creerClientNavigateur()
├─ stockage/
│  ├─ stockage.ts     interface Stockage, magasins et leurs gardes, cleJeuNiveau, prefixeReserve
│  ├─ schema.ts       VERSION_SCHEMA, MIGRATIONS, migrer()
│  ├─ memoire.ts      implémentation en mémoire (tests)
│  ├─ indexeddb.ts    implémentation IndexedDB (navigateur)
│  └─ persistance.ts  demande de stockage persistant (navigator.storage.persist)
├─ packs.ts           grilles des packs, jamais resservies avant épuisement
├─ reserve.ts         réserve de grilles d'avance, obtenirGrille, réalimentation
├─ historique.ts      annuler / rétablir (pur, générique)
├─ chrono.ts          chronomètre avec pauses manuelle et automatique (pur)
└─ visibilite.ts      surveillance de visibilitychange (branchée sur le chrono)
```

### Indices du sudoku classique (étape 3c) — `games/sudoku-classique/indice.ts`

1. Un chiffre faux est signalé en premier (action : l'effacer).
2. Sinon, **première étape** du solveur logique (la technique la plus simple qui avance). Le solveur part des
   chiffres posés et des **notes du joueur quand elles sont fiables** : une case dont les notes contiennent le
   bon chiffre garde ses notes (candidats calculés ∩ notes) ; sinon, candidats calculés. La solution reste donc
   toujours parmi les candidats (l'étape est juste) et une élimination déjà faite n'est pas reproposée.
   Placement → action `placer` (ou `placer-seul` sans retrait automatique) ; éliminations → action
   `definir-notes` qui fixe les notes des cases concernées (leurs candidats moins ceux éliminés).
3. Filet de sécurité (solveur bloqué) : le chiffre d'une case.

Actions du sudoku : `placer` (retire la note des voisines), `placer-seul` (sans retrait : le choix est inscrit
dans l'action pour que rejouer l'historique donne toujours le même état), `noter`, `effacer`,
`definir-notes` (notes de plusieurs cases d'un coup : « Remplir les notes », éliminations d'un indice ; une
seule action, donc un seul « Annuler »). « Remplir les notes » calcule les candidats à partir des seuls
chiffres posés (jamais de la solution) et **remplace** les notes existantes.

### Interface du sudoku jouable (étape 3b)

```
src/socle/
├─ partie.ts          PARTIE EN COURS (pur) : historique + chrono + état ; jouer, annuler, rétablir,
│                     pause, visibilité, fin de partie ; versSauvegarde / depuisSauvegarde
├─ stats.ts           statistiques (pur) : enregistrerTerminee (sans record si indices), enregistrerAbandon,
│                     estNouveauRecord, tempsMoyenMs, forceMoyenne, lignesStats (tableau affiché)
├─ service-parties.ts partie en cours et statistiques dans le stockage (écritures mises en série)
├─ format.ts          formaterTemps (« 12:34 »), etoiles (pur)
├─ app.ts             navigation (accueil, partie, statistiques, fin), confirmation, chargement,
│                     bouton retour d'Android, réglages appliqués et enregistrés
├─ accueil.ts         écran d'accueil : « Continuer », choix du niveau, menu Statistiques / Réglages
├─ ecran-partie.ts    écran de partie : barre, grille du jeu, outils (dont Remplir les notes et Indice),
│                     pavé, bandeau de l'indice, chrono, sauvegarde, clavier
├─ ecran-reglages.ts  fenêtre des réglages (étape 3c)
├─ ecran-stats.ts     écran des statistiques par jeu et par niveau (étape 3c)
├─ ecran-fin.ts       écran de fin de partie (étape 3c)
├─ bilan-fin.ts       lignes du bilan de fin et message sur le record (pur, étape 3c)
├─ reglages.ts        completerReglages : réglages anciens complétés (pur, étape 3c)
├─ dialogue.ts        confirmer / informer (élément <dialog>)
├─ chargement.ts      indicateur de chargement (visible après 0,25 s) avec Annuler
└─ dom.ts             petits utilitaires DOM (creer, bouton, boutonIcone)
```

- **Partie** (`Partie`, pur) : une action **sans effet** (état identique) n'est pas enregistrée, pour
  qu'« Annuler » annule toujours quelque chose de visible. Une partie terminée est figée (chrono arrêté,
  plus d'action ni d'annulation). `depuisSauvegarde` refuse une sauvegarde incohérente (autre jeu, autre
  `versionFormat`, données ou actions refusées par les gardes du jeu, curseur invalide) : l'appli la supprime
  et prévient le joueur.
- **Écran de partie** : redessine puis **sauvegarde après chaque action**, et aussi quand l'appli passe en
  arrière-plan (Android peut alors la fermer). Le chrono est en pause automatique en arrière-plan ; la pause
  manuelle **masque la grille**. Fin de partie : statistiques enregistrées (`terminer` renvoie le record battu
  ou non et l'ancien record), partie en cours supprimée, puis écran de fin. Clavier physique : chiffres,
  Retour arrière/Suppr, N (notes), Ctrl+Z / Ctrl+Y ; les flèches sont gérées par la vue du jeu.
- **Outils** : Notes, Effacer, Annuler, Rétablir, Remplir les notes (si le jeu fournit `remplirNotes`), Indice
  (avec le nombre d'indices utilisés). Toute action ferme le bandeau d'un indice affiché.
- **Navigation** : en quittant l'accueil (partie, statistiques), **une** entrée est ajoutée à l'historique du
  navigateur ; l'écran de fin et la partie suivante la réutilisent. Le bouton retour d'Android ramène
  toujours à l'accueil.
- **Mise en page** (`src/styles/base.css`) : portrait = barre, grille, outils, pavé sur une ligne ; paysage
  = grille à gauche sur toute la hauteur, barre + pavé 3 × 3 + outils à droite. La grille est placée dans un
  conteneur `container-type: size` : la vue y prend le plus grand carré possible (`min(100cqw, 100cqh)`).
- **Thème** : direction visuelle « Ardoise » (gris bleutés, accent bleu encre, police du système), toutes
  les couleurs dans `src/styles/theme.css` (clair et sombre).
- **Bouton retour d'Android** : entrer dans une partie ajoute une entrée à l'historique du navigateur ;
  « retour » ramène à l'accueil (après sauvegarde) au lieu de quitter l'appli.

- **Client du worker** (`creerClientWorker`) : `generer(jeu, niveau, 'urgent' | 'fond')` renvoie
  `{ resultat, annuler }` ; le résultat (`ok` + puzzle, `echec`, `erreur`, `annule`) ne rejette jamais.
  Une seule demande à la fois chez le worker ; les urgentes passent devant. Annuler une demande en attente
  la retire de la file ; annuler celle en cours **arrête le worker** (un calcul synchrone ne lit pas ses
  messages) et un nouveau est créé pour la suivante. Garde-fou : pas de réponse après budget + marge
  (4 s + 10 s) → worker arrêté, résultat `erreur`. Les réponses d'un ancien worker sont ignorées ; la grille
  reçue est vérifiée (`estPuzzle`).
- **Stockage** : interface `Stockage` (`lire`, `ecrire`, `supprimer`, `lister(prefixe)`, `compter(prefixe)`,
  `prendrePremier(prefixe)`, `fermer`). Magasins : `parties` (une partie en cours **par jeu**, clé = id du jeu),
  `reserve` (clé `<jeu>/<niveau>/<horodatage>-<compteur>`), `packsJoues` (clé `<jeu>/<niveau>`), `stats`
  (clé = id du jeu), `reglages` (clé unique). Toute valeur relue passe par la garde de son magasin
  (`src/utils/gardes-sauvegarde.ts`) : une entrée invalide est ignorée. **`prendrePremier` est atomique**
  (lecture + suppression dans une seule transaction IndexedDB) : une grille n'est jamais servie deux fois,
  même avec deux onglets. À l'ouverture, IndexedDB applique les **migrations** manquantes
  (`onupgradeneeded`) puis demande le **stockage persistant** (résultat simplement journalisé).
  Pour changer le schéma : ajouter une migration à la fin de `MIGRATIONS`, ne jamais modifier les anciennes.
- **Packs** (`creerServicePacks`) : pour chaque jeu/niveau, un ordre mélangé des grilles et une position
  (`EtatPack`) ; pack épuisé → nouvel ordre (cycle suivant) qui ne commence pas par la dernière grille servie ;
  taille du pack changée → nouvel ordre. Tirages d'un même jeu/niveau mis en série.
- **Réserve** (`creerServiceReserve`) : `obtenirGrille(jeu, niveau)` → réserve, sinon pack, sinon
  génération **urgente** relancée immédiatement (abandon après 3 erreurs techniques d'affilée), annulable ;
  puis réalimentation. `reapprovisionner(jeu, niveau)` : une grille à la fois, ordre = jeu et niveau en
  cours, puis ses autres niveaux du plus facile au plus difficile, puis les autres jeux ; couple en échec mis
  de côté 30 s, 2 min puis 10 min (les autres continuent) ; une urgence annule la demande de fond en cours.
- **Chrono** : `{ cumulMs, depuis, pauseManuelle, masque, termine }` ; tourne seulement sans pause manuelle,
  appli visible et partie non terminée. Les deux pauses sont indépendantes.

## Contrat des modules de jeu

Défini dans `src/types/jeu.ts` (logique, pur) et `src/types/vue.ts` (affichage, DOM). Chaque jeu choisit
trois types JSON : **D** (données de la grille : énoncé, solution), **E** (état de saisie du joueur),
**A** (action du joueur).

### `LogiqueJeu<D, E, A>` — fichier `logique.ts`, `export const logique`

| Membre | Rôle |
|---|---|
| `meta` | `MetaJeu` : id (= dossier), nom, description, niveaux, `versionFormat` |
| `generer(niveau, alea, { doitArreter })` | `{ ok: true, donnees, notation }` ou `{ ok: false, raison }` (exécuté dans le worker) |
| `noter(donnees)` | `Notation` (niveau, force, technique max, détails) ou `null` si l'essai-erreur est nécessaire |
| `etatInitial(donnees)` | état E en début de partie |
| `appliquer(etat, action, donnees)` | **nouvel** état (jamais de mutation) |
| `erreurs(etat, donnees)` | cases fausses (comparaison avec la solution) |
| `estTerminee(etat, donnees)` | grille complète et juste |
| `indice(etat, donnees, options)` | `Indice` ou `null` (voir ci-dessous) ; `options.retraitAutoNotes` = réglage du joueur |
| `remplirNotes?(etat, donnees)` | facultatif : UNE action qui remplace les notes des cases vides par tous leurs candidats, ou `null` |
| `nomTechnique(id)` | nom affiché de `Notation.techniqueMax` (écran de fin) |
| `estDonnees` / `estEtat` / `estAction` | gardes de type pour relire sauvegardes et imports |
| `migrer?(ancien, version)` | facultatif : conversion d'un ancien format |

**`Indice<A>`** (deux temps) : `titre` (technique), `explication`, `marques` (`MarquesIndice` :
`cellules` du motif, `zones` = cases des régions concernées, `candidats` du motif, `eliminations`,
`placements`), `libelleAction` (« Placer le 7 en L3C5 », « Retirer 3 candidats ») et `action`.
Le socle affiche titre et explication, la vue dessine les marques, puis le socle joue l'action si le joueur
le demande.

Le worker enveloppe le résultat de `generer` dans un `Puzzle` (`jeu`, `graine`, `notation`, `donnees`).
`alea` est un générateur **à graine** (`src/utils/alea.ts`) : même graine → même grille.

### `VueJeu<D, E, A>` — fichier `vue.ts`, `export const vue`

- `pave` : `{ type: 'commun', valeurs: ['1', …] }` pour le pavé du socle, ou `{ type: 'personnalise' }`
  (ex. chiffres casés, qui affiche sa propre liste de nombres).
- `monter(conteneur, contexte)` → `InstanceVue` : `afficher({ etat, donnees, erreurs, indice })` (`indice` =
  marques à dessiner, ou `null`), `saisir(valeur)`, `effacer()`, `detruire()`.
- `contexte` : `jouer(action)`, `modeNotes()`, `reglages()` — une **fonction** : les réglages peuvent changer
  pendant la partie (mise en évidence, retrait automatique des notes), la vue les relit à chaque affichage.
  Le conteneur est dimensionné par le socle (`container-type: size`).
- `restants(etat, donnees)` : pour le pavé commun, nombre de fois où chaque valeur peut encore être posée
  (petit nombre sur la touche, touche estompée à 0), ou `null`.
- La vue ne modifie jamais l'état : elle appelle `contexte.jouer(action)` ; le socle rappelle `afficher`.
- Elle charge son CSS avec `chargerFeuilleDeStyle(new URL('./style.css', import.meta.url))`.

### `ModuleJeu` — fichier `index.ts`, `export const jeu`

`{ meta, chargerLogique, chargerVue, chargerPack }` : l'accueil ne charge que les métadonnées ; logique et
vue sont importées à la demande (`import()` dynamique). `chargerPack(niveau)` renvoie les grilles du pack du
niveau sous forme de `Puzzle` (ou `null` sans pack) ; le service des packs du socle l'appelle quand la
réserve est vide.

### Registre — `src/games/registre.ts`

Une ligne par jeu : `{ id: 'sudoku-classique', charger: () => import('./sudoku-classique/index.ts') }`.
Les tests (`tests/games/registre.test.ts`) vérifient automatiquement chaque jeu enregistré.

### Worker

Messages typés dans `src/types/worker.ts`. Le worker charge `../games/<id>/logique.js` par convention
(id validé en kebab-case) : il ne dépend ni du registre ni du DOM. La demande `generer` porte un
**budget de temps** `budgetMs` : le worker passe au jeu `doitArreter = () => maintenant() >= échéance`, que
`generer` consulte entre deux essais (réponse `echec` si le budget est épuisé). Le traitement est dans
`src/worker/traitement.ts` (testable sous Node) ; `generation.ts` ne fait que brancher `postMessage`.

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
  cases et candidats du motif, régions, placements, éliminations, explication en français. Elle sert
  aux indices expliqués (étape 3c, `games/sudoku-classique/indice.ts`).
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
- `genererParNiveau(def, niveau, alea, { tentativesMax, symetrie = 'centrale', cibleIndices, seuils, doitArreter = null })`
  → `{ ok: true, enonce, solution, notation, essais }` ou `{ ok: false, raison, essais }`. Chaque essai :
  grille complète, puis `retirerChiffres` dont la fonction d'acceptation **refuse** un retrait si la grille
  n'est plus résoluble avec les techniques du niveau, et **arrête** tôt (Débutant, Facile) quand le nombre
  de chiffres atteint une cible tirée dans `CIBLES_ARRET_TOT`. Contrôle final : niveau exact, sinon essai
  suivant. Le contexte du solveur est calculé une fois par appel.
- **Limite** : avec `doitArreter` (worker), le budget de temps est la **seule** limite (aucune limite
  d'essais, sauf `tentativesMax` explicite) ; sans budget (bench, script des packs), au plus
  `TENTATIVES_MAX_SANS_BUDGET` (50) essais. `tentativesMax: null` sans `doitArreter` est refusé (boucle infinie).
- Dans le worker : génération limitée par son seul budget de temps ; si la réserve est vide,
  grille tirée du pack (Expert/Diabolique).

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
