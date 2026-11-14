# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Une entrée par étape.

## [Étape 6a, correction] — Détection des mises à jour, fenêtre « Sac2Riz a été mis à jour » — 2026-11-14

### Corrigé (diagnostic : la tablette était passée à la nouvelle version sans rien annoncer)
- **Version trouvée avant que la page écoute** : au démarrage, une version déjà EN COURS D'INSTALLATION
  (trouvée par le navigateur, en parallèle du démarrage, avant l'écoute de `updatefound`) n'était pas suivie :
  elle l'est désormais (`mise-a-jour.ts`) ; le suivi démarre juste après l'ouverture du stockage, et une
  recherche est demandée tout de suite.
- **Recherche au retour au premier plan** : au plus une fois par MINUTE au lieu d'une fois par heure depuis
  le lancement (une appli reprise depuis l'arrière-plan ne cherchait rien pendant une heure).

### Ajouté
- **Fenêtre « Sac2Riz a été mis à jour »** : quand le navigateur a installé la nouvelle version à la fermeture
  complète de l'appli (fonctionnement normal, impossible à empêcher simplement), ses nouveautés sont montrées
  au lancement suivant — jamais au tout premier lancement, une seule fois, rien sans nouveauté visible, toutes
  les nouveautés depuis la dernière vue (`socle/pwa/apres-mise-a-jour.ts`, pur).
- Stockage : magasin `appli` (migration n° 2) pour les nouveautés vues (ni exporté ni remplacé par un
  import) ; `Stockage.baseNeuve`.
- Nouveautés pour le joueur : groupe « Des nouveautés toujours présentées ».
- Tests : version en cours d'installation au démarrage, recherche immédiate et toutes les minutes, décision
  de la fenêtre, magasin `appli`, migration n° 2 (552 tests). Vérifié dans Edge : premier lancement sans
  fenêtre, mise à jour installée par la fermeture puis fenêtre une seule fois, mise à jour par le bouton sans
  fenêtre ensuite.

## [Étape 6a, complément] — Bouton « Mettre à jour » et nouveautés — 2026-11-14

### Ajouté
- **Bouton « Mettre à jour »** (`socle/pwa/annonce-mise-a-jour.ts`) à côté du bouton Réglages, partout où il
  est affiché (accueil, fiche d'un jeu — qui reçoit aussi un bouton Réglages —, partie), visible seulement
  quand une nouvelle version est prête ; petit point d'accent discret.
- **Fenêtre de confirmation** (`socle/pwa/fenetre-mise-a-jour.ts`) : versions installée et nouvelle (date et
  heure), nouveautés, ce qui va se passer, ce qui est conservé, ce qui est supprimé ; « Mettre à jour » /
  « Annuler ».
- **Nouveautés pour le joueur** : `public/nouveautes.json` (`src/types/nouveautes.ts`), rédigées pour l'étape
  6a, l'accueil en cartes et ce bouton. Lues dans le cache de la nouvelle version, déjà téléchargée
  (`socle/pwa/infos-mise-a-jour.ts`, pur) : seulement les groupes absents de la version installée, du plus
  récent au plus ancien ; rien si aucune nouveauté visible. Règle dans CLAUDE.md : une ligne par
  modification visible, dans le même commit.
- Tests : fichier des nouveautés (format, identifiants, ordre, vocabulaire), choix des nouveautés, lecture de
  la nouvelle version dans un faux cache (539 tests). Vérifié dans Edge : vraie mise à jour simulée (version A
  puis B), bouton apparu sans rechargement, fenêtre, Annuler, Mettre à jour (ancien cache supprimé, partie
  conservée), en paysage et portrait.

### Modifié
- Plus de bandeau « Nouvelle version disponible » ni de bouton « Plus tard » (`bandeau-mise-a-jour.ts` retiré).
  Le mécanisme ne change pas : jamais de rechargement sans le feu vert du joueur.
- Accueil : le menu passe sous le titre en dessous de 60rem de large (il recouvrait le titre avec trois boutons).

## [Étape 6a, correction] — Workflow de déploiement — 2026-11-14

### Corrigé
- `.github/workflows/deployer.yml` illisible par GitHub depuis l'étape 6a (« Invalid workflow file », ligne 32) :
  le libellé d'une étape, non cité, contenait « : » suivi d'une espace, que YAML lit comme une nouvelle clé.
  Libellé mis entre guillemets (et reformulé) ; `fetch-depth: 0` conservé. Les déploiements de 732bfea et
  c170164 n'avaient pas eu lieu.

### Ajouté
- `npm run workflows` (`scripts/verifier-workflows.ts`, sans dépendance), lancé par `npm run check` : lecteur
  YAML strict limité aux constructions utilisées par nos workflows (tout le reste est refusé avec un message)
  et contrôle de la structure attendue par GitHub. Il détecte l'erreur ci-dessus à la même ligne que GitHub.
  Tests : `tests/scripts/workflows.test.ts` (workflows du dépôt, erreur de l'étape 6a, lecture, erreurs de
  syntaxe et de structure).

## [Étape 6a, complément] — Accueil en grille de cartes — 2026-11-14

### Modifié
- **Accueil** : les jeux s'affichent en grille de cartes (`repeat(auto-fill, minmax(min(100%, 19rem), 1fr))` :
  3 colonnes en paysage sur tablette, 2 en portrait, 1 sur un écran très étroit), de même hauteur par rangée.
  Chaque carte montre en haut un petit aperçu en lecture seule (partie en cours, sinon grille d'exemple,
  dessiné par `vue.apercu` dès que le jeu est chargé), puis le nom, la description et la pastille « Partie en
  cours ». Toute la carte se touche (un bouton invisible la couvre : l'aperçu peut contenir des boutons de
  cases, et un bouton ne doit pas en contenir d'autres). Style actuel conservé (le design viendra en 6b).

## [Étape 6a] — Nouvelle structure des écrans et des réglages — 2026-11-14

### Ajouté
- **Fiche d'un jeu** (`socle/ecran-fiche.ts`), ouverte en touchant un jeu sur l'accueil : nom et description,
  aperçu en petit non jouable (partie en cours, sinon grille d'exemple), « Continuer » (niveau, force exacte,
  temps), « Nouvelle partie » avec le choix du niveau, règles, statistiques de ce jeu (écran des statistiques
  limité au jeu).
- **Contrat** : `fiche.ts` par jeu (`FicheJeu` : `regles`, `exemple`), `ModuleJeu.chargerFiche`,
  `VueJeu.apercu` (grille en lecture seule) ; `MetaJeu.reglages` (`ReglageJeu` : id, type `interrupteur`,
  libellé, détail, valeur par défaut, `preparation`) affichés automatiquement par le socle ;
  `utils/reglages-jeu.ts` (`estActif`, `valeursCompletes`, `preparationDemandee`). Sudoku : réglage
  `retraitAutoNotes` ; chiffres casés : `nombreAuDepart`. Fiches et aperçus des deux jeux et du modèle.
- **Navigation** (`socle/navigation.ts`, pur) : écrans, parents et profondeurs ; une entrée d'historique par
  cran ; bouton retour d'Android partie → fiche du jeu → accueil.
- **Version** dans les réglages : date et heure du build et début de l'empreinte (« 14/11/2026 17:30 ·
  a1b2c3d4 »), lues dans `version.json` (écrit par le build, mis en cache) ; date **figée par les sources**
  (`scripts/date-build.ts` : dernier commit touchant les sources de l'appli, ou date de modification des
  sources non commitées) et comprise dans l'empreinte : deux builds identiques gardent la même version.
  GitHub Action : historique complet (`fetch-depth: 0`).
- Tests : navigation, réglages de jeu, migration des réglages (V1, V2, V3, forme actuelle, valeur d'un autre
  type), import des fichiers n° 1 et n° 2, version et date du build, fiche et réglages de chaque jeu dans le
  test du contrat (525 tests).

### Modifié
- **Accueil** : liste des jeux (nom, description, pastille « Partie en cours ») ; plus de partie lancée
  depuis l'accueil.
- **Niveaux** affichés avec leur force partout à la place des étoiles (`libelleNiveau` : « Débutant · Force
  1-2 » ; `libelleForce` : « Moyen · Force 6 » pour la force exacte de la grille) : fiche, barre de la partie,
  « Continuer », confirmation de remplacement, fin de partie (une ligne « Niveau » au lieu de « Niveau » +
  « Force »), statistiques. `etoiles()` et `InfosNiveau.etoiles` retirés.
- **Réglages** en trois sections : Application (thème, sauvegarde, version), Tous les jeux (vérification des
  erreurs, mise en évidence), Par jeu (pendant une partie : le jeu en cours seulement). Nouvelle forme
  enregistrée `Reglages` = `{ theme, verifierErreurs, miseEnEvidence, jeux }` ; anciennes formes converties
  à la lecture (`normaliserReglages`, choix du joueur conservés). La fenêtre s'ouvre en haut.
- `LogiqueJeu.indice` et `preparer` reçoivent les valeurs des réglages du jeu (`ValeursReglagesJeu`) au lieu
  de `OptionsJeu` / `OptionsDepart` ; `ContexteVue.reglages()` renvoie `ReglagesVue` (`verifierErreurs`,
  `miseEnEvidence`, `jeu`) ; demande `preparer` du worker : valeurs des réglages du jeu.
- Export : `VERSION_EXPORT` = 2 (réglages par section) ; l'import accepte aussi les fichiers n° 1.
- Fin de partie : boutons « Nouvelle partie » et « Retour » (vers la fiche du jeu, au lieu de l'accueil).
- Import possible hors d'une partie (accueil, fiche, statistiques).

## [Étape 5] — PWA hors ligne, export/import, déploiement — 2026-11-14

### Ajouté
- **Icônes** provisoires : `icone.svg`, `icone-192.png`, `icone-512.png`, `icone-maskable-512.png`
  (Android), générées depuis une même description de formes par `npm run icones`
  (`scripts/generer-icones.ts`, `scripts/icones/` : rendu lissé et encodeur PNG sans dépendance, zlib de Node).
  Manifest : `id`, icônes PNG « any » et « maskable ».
- **Service worker** (`src/service-worker.ts`, compilé à la racine de `dist/`, portée = toute l'appli) : tous
  les fichiers de l'appli, packs des deux jeux compris, mis en cache à l'installation → 100 % hors ligne.
  Liste et version écrites automatiquement à la fin de `npm run build` (`scripts/manifeste-precache.ts` :
  version = empreinte du contenu de `dist/`, identique tant que rien ne change). Un cache par version,
  anciens caches supprimés à l'activation. IndexedDB jamais touché : données conservées aux mises à jour.
- **Mises à jour** (`src/socle/pwa/`) : bandeau discret « Nouvelle version disponible » (Recharger / Plus
  tard) ; l'appli ne se recharge jamais d'elle-même ; « Recharger » sauvegarde d'abord la partie en cours
  (`App.sauvegarder`). Nouvelle recherche quand l'appli revient au premier plan (au plus une fois par heure).
- **Export / import** (Réglages → Sauvegarde) : fichier `sac2riz-sauvegarde-AAAA-MM-JJ.json` (réglages,
  parties en cours, statistiques, avancement dans les packs ; pas la réserve). Import depuis l'accueil
  seulement : analyse complète (`socle/donnees/import.ts` : format, version, gardes, jeux connus, parties
  rejouées par leur jeu), message clair en cas de refus sans rien modifier, confirmation avec résumé, puis
  remplacement **atomique** (`Stockage.remplacerDonnees`, une transaction IndexedDB) et redémarrage.
- **Déploiement** : GitHub Action `.github/workflows/deployer.yml` (`npm ci`, `npm run check`,
  `npm run build`, publication de `dist/` sur GitHub Pages seulement si tout passe).
- `npm run apercu` : build puis serveur local (tester le hors-ligne dans Edge).
- Tests : export/import et `remplacerDonnees`, suivi des mises à jour (faux service worker), encodeur PNG et
  icônes, manifeste du service worker (498 tests). Vérifié dans Edge automatisé : installation, hors ligne
  (serveur arrêté, partie Expert depuis le pack), import refusé puis accepté, bandeau sans rechargement
  automatique, rechargement au clic avec la partie conservée, ancien cache supprimé.

### Modifié
- `FichierExport` : les données sont regroupées dans `donnees` (`DonneesExportees`, + `packsJoues`),
  `VERSION_EXPORT` = 1. Écran des réglages : section « Sauvegarde » (`SauvegardeReglages`).

## [Étape 4b, corrections] — Chiffres casés : après les essais sur tablette — 2026-11-14

### Ajouté
- Réglage « Toujours placer un nombre au départ » (désactivé par défaut, enregistré avec les autres) : une
  nouvelle grille de chiffres casés sans aucun pré-placé en reçoit un, avec le statut d'un pré-placé (gras,
  verrouillé, non modifiable). Choix (`chiffres-cases/depart.ts`) : la meilleure ouverture (emplacements
  posables d'emblée par des déductions simples) parmi les nombres qui gardent le niveau de la grille ; mesures
  dans DIFFICULTE.md. Sans effet sur une grille qui a déjà un pré-placé et sur une partie en cours.
- Contrat logique : `preparer(donnees, options)` (`OptionsDepart`) ; sudoku et modèle : données inchangées.
- Worker : demande `preparer` (réponse `genere`) ; client : `preparer(puzzle, options)` ; un second worker,
  créé au premier besoin, prépare la grille d'une nouvelle partie (jamais derrière une génération de fond).
- Réglages : forme `ReglagesV2` (étapes 3c à 4b) complétée à la lecture.

### Modifié
- Cases noires de la couleur exacte du fond de l'appli : `--couleur-case-noire` pointe sur
  `var(--couleur-fond)` (suit le thème). La forme de la grille est dessinée par le contour de 1 px des cases
  blanches (`--couleur-trait-epais`), lisible en clair et en sombre.
- Pose définitive dès le toucher qui place le nombre (emplacement d'abord comme nombre d'abord) : la
  sélection est levée. Cause : la pose était bien jouée et sauvegardée tout de suite, mais la sélection
  restait active, l'emplacement surligné et le nombre posé affiché « choisi » (fond plein) au lieu de
  barré ; il fallait toucher ailleurs pour voir la pose « validée ».
- Un nombre qui contredit un nombre croisé déjà posé (pré-placé ou non) **n'est plus posé** ; le nombre
  croisé n'est plus retiré. Rien ne change (le nombre reste disponible, la sélection reste) et les cases en
  conflit clignotent (signal ambré, 3 pulsations, ~1 s). Même règle pour un déplacement : en cas de conflit,
  le nombre reste à son ancien emplacement. Un déplacement compatible ne change pas (cases quittées
  signalées).
- La liste des nombres garde toujours le même ordre (longueurs croissantes) : le groupe de la longueur
  visée n'est plus remonté en tête, il est seulement surligné (les autres longueurs restent estompées). S'il
  est hors de vue, la liste défile doucement juste assez pour le montrer (`defilementPourVoir` dans
  `interaction.ts`, sans animation si les animations sont réduites) ; s'il est visible, rien ne bouge.
- `consequencesPlacement` : `conflits` (cases en conflit) remplace `retires`. `interaction.ts` :
  `Reaction.signal` (`deplacement` | `conflit`) et `poser` remplacent `casesASignaler`.
- L'indice n'est pas modifié et n'entre pas en conflit avec la règle : il signale d'abord les nombres faux,
  puis ne pose que des nombres de la solution.

## [Étape 4b] — Chiffres casés : interface et intégration — 2026-11-14

### Ajouté
- Chiffres casés jouables, enregistrés dans le registre : l'accueil propose deux jeux, chacun avec son
  « Continuer » et ses niveaux.
- `chiffres-cases/vue.ts` et `style.css` (direction « Ardoise », clair et sombre) : grille à cases noires
  aux proportions de la grille, liste des nombres groupée par longueur dans la zone du pavé.
- `chiffres-cases/interaction.ts` (pur, testé) :
  - toucher une case sélectionne son emplacement (l'horizontal d'abord ; toucher à nouveau la même case
    bascule sur le vertical) ; un nombre de la bonne longueur le remplit, les autres longueurs sont
    estompées et sans effet ;
  - sans sélection, toucher un nombre le sélectionne et met en évidence les emplacements vides de sa
    longueur ; toucher l'un d'eux y place le nombre ; toucher à nouveau le nombre ou une zone vide annule ;
  - groupe de la longueur visée en tête et surligné ; nombres utilisés barrés et toujours déplaçables ;
    nombres pré-placés distincts, verrouillés ; « Effacer » vide l'emplacement sélectionné ;
  - signal bref (0,9 s) sur les cases d'un nombre déplacé ou d'un nombre croisé retiré
    (`consequencesPlacement`) ; contour fixe si les animations sont réduites ; flèches du clavier, Échap.
- Indices en deux temps, vérification des erreurs, réglages, chrono, pause, sauvegarde, statistiques et
  fin de partie : ceux du socle, sans code propre au jeu.
- Variable de thème `--couleur-case-noire` (clair et sombre).

### Modifié (contrat de vue, changements acceptés par l'utilisateur)
- `monter(zones, contexte)` : `zones = { grille, pave }` ; `pave` est la zone du pavé confiée à la vue
  quand elle choisit `{ type: 'personnalise' }` (`null` avec le pavé commun). Mise en page dédiée
  (`.partie.pave-personnalise`) : zone défilable, sous la grille en portrait, colonne plus large en paysage ;
  masquée pendant un indice et en pause.
- `VueJeu.outilsMasques` : outils du socle à masquer (`'notes' | 'effacer' | 'indice'`) ; le sudoku n'en
  masque aucun, les chiffres casés masquent « Notes » (touche N désactivée). Barre d'outils adaptée au
  nombre d'outils (`src/socle/outils.ts`, testé).
- Tests du registre : la configuration de la vue de chaque jeu est vérifiée ; seuls les niveaux sans
  réglage dans `meta.generation` sont générés dans `npm test` (les autres : `npm run test:long`).
- Vérifié : le compteur des touches du pavé et « Remplir les notes » (retirés en 3c) n'existent plus ;
  `restants` reste dans le contrat (il estompe une touche épuisée), les chiffres casés renvoient `null`.

## [Étape 4a] — Chiffres casés : logique pure — 2026-11-14

### Ajouté
- Module `src/games/chiffres-cases/` (pas encore dans le registre : la vue arrive à l'étape 4b) :
  - modèle : emplacements d'au moins 2 cases déduits des cases noires, croisements, liste des nombres
    déduite de la solution (triée par longueur puis valeur), structure mise en cache par grille ;
  - règles du joueur : placer un nombre entier dans un emplacement (un nombre déjà posé ailleurs est
    déplacé, les nombres croisés contradictoires sont retirés), effacer, nombres utilisés (à barrer),
    erreurs, fin de partie ; `consequencesPlacement` indique à la vue d'où un nombre a été déplacé et
    quels nombres ont été retirés (signal visuel de la 4b) ; un pré-placé n'est jamais modifié ;
  - solveur logique : 10 techniques graduées, de « longueur unique » (Débutant) aux « hypothèses »
    (Diabolique), une par fichier, chacune testée ; backtracking pour l'unicité ;
  - générateur : motif symétrique et connexe, chiffres au hasard, marche aléatoire de petites
    modifications vers les grilles du niveau, pré-placés selon le niveau ; budget de temps respecté ;
  - notation (niveau + force, `VERSION_NOTATION_CASES` = 1), indices en deux temps (nombre faux d'abord,
    puis chemin du solveur jusqu'au prochain placement), gardes de type ;
  - packs : format propre au jeu (`packs.ts`), 200 grilles Expert et 200 Diabolique.
- Contrat : `MetaJeu.generation`, réglage par niveau : `{ mode: 'pack' }` (servi uniquement par le pack,
  jamais généré sur l'appareil) ou `{ mode: 'worker', budgetFondMs }` (budget de réalimentation plus long
  que le budget urgent). Chiffres casés : Diabolique servi par son pack, Expert réalimenté avec 30 s.
- Bench : `npm run bench -- --jeu=chiffres-cases [--niveau=<id>]`. Packs : `npm run packs -- --jeu=<id>`
  (scripts par jeu dans `scripts/packs/`).
- Tests : `tests/games/chiffres-cases/` (modèle, règles, gardes, solveur, techniques, génération, indices,
  packs) ; tests longs `surete.long.ts` et `packs.long.ts` ; `verifierLogique(logique, niveaux)` contrôle
  la logique d'un jeu sans vue ; tests du socle pour les réglages de génération et le budget par demande.

### Modifié
- Client du worker : `generer(jeu, niveau, priorite, budgetMs)` (budget par demande, `null` = défaut) ; le
  garde-fou suit le budget de la demande ; un budget invalide est refusé.
- Réserve : un niveau « pack » n'est ni réalimenté ni généré en urgence (pack introuvable = erreur claire) ;
  la réalimentation utilise le budget de fond du niveau. `main.ts` transmet `meta.generation`.
- Sudoku et modèle : `generation: {}` (aucun changement de comportement).
- `npm test` reste sous 10 s : le contrôle du contrat des chiffres casés ne génère que les niveaux rapides,
  Expert et Diabolique passent dans `npm run test:long`.
- Documentation : AJOUTER_UN_JEU.md (leçons d'un jeu hors de la famille sudoku, réglages de génération),
  DIFFICULTE.md (difficulté des chiffres casés), ARCHITECTURE.md, ROADMAP (étape 4 découpée en 4a / 4b).

## [Étape 3c — retraits] — Pavé sans nombre restant, plus de « Remplir les notes » — 2026-11-13

### Retiré
- Pavé : le petit nombre en bas à droite de chaque touche (combien de fois le chiffre peut encore être
  posé). La touche reste estompée quand le chiffre est posé partout : `VueJeu.restants` est donc gardé
  dans le contrat (le socle ne s'en sert plus que pour ce cas) ; style `.touche-reste` supprimé.
- Bouton « Remplir les notes » et méthode facultative `remplirNotes` du contrat (`LogiqueJeu`) ; module
  `sudoku-classique/notes.ts` supprimé ; contrôle correspondant retiré de `verifier-module.ts`.

### Conservé
- Action `definir-notes` du sudoku : elle applique les indices d'élimination, et les parties sauvegardées
  dont l'historique contient un ancien remplissage restent lisibles et rejouables, sans changer
  `versionFormat`. Nouveau test : sauvegarde avec remplissage relue après passage par JSON, rejouée,
  annulable et rétablissable.

## [Étape 3c] — Indices, erreurs, réglages, statistiques, fin de partie — 2026-11-13

### Ajouté
- Indices en deux temps : mise en évidence (régions, cases et candidats du motif, éliminations barrées en
  rouge, chiffre à placer en vert) avec le nom et l'explication de la technique dans un bandeau à la place
  du pavé, puis « Appliquer » (placement ou éliminations, annulable). Compteur d'indices sur le bouton,
  augmenté dès que l'indice est montré, sauvegardé avec la partie.
- Indices du sudoku (`games/sudoku-classique/indice.ts`) : chiffre faux d'abord, puis première étape du
  solveur logique à partir des chiffres posés et des notes fiables du joueur.
- Bouton « Remplir les notes » : une seule action annulable qui remplace les notes de toutes les cases vides
  par leurs candidats possibles.
- Écran des réglages (fenêtre, depuis l'accueil et pendant la partie) : vérification des erreurs, mise en
  évidence, retrait automatique des notes, thème (Automatique / Clair / Sombre).
- Écran des statistiques par jeu et par niveau (terminées, abandonnées, meilleur temps, temps moyen, force
  moyenne) et écran de fin de partie (temps, niveau, force, technique la plus difficile, indices, record).
- Actions du sudoku `placer-seul` (pose sans retrait des notes) et `definir-notes` (notes de plusieurs cases).
- Socle : `ecran-reglages.ts`, `ecran-stats.ts`, `ecran-fin.ts`, `bilan-fin.ts`, `reglages.ts` ;
  `compterIndice` (partie), `estNouveauRecord`, `forceMoyenne`, `lignesStats` (stats).
- Tests : `sudoku-indices.test.ts`, `reglages.test.ts`, `bilan-fin.test.ts`, compléments (sudoku, stats,
  service des parties, partie, gardes, contrat des modules) : 326 tests.

### Modifié
- Contrat des jeux : `Indice` (titre, explication, marques, libellé, action), `indice(etat, donnees, options)`,
  `remplirNotes` facultatif, `nomTechnique` ; vue : `afficher({ etat, donnees, erreurs, indice })` et
  `contexte.reglages()` (fonction : réglages modifiables pendant la partie). Module `_modele` adapté.
- Statistiques : une partie terminée avec des indices compte (terminées, moyennes) mais ne peut pas battre le
  meilleur temps ; `terminer` reçoit la partie terminée et renvoie le record battu ou non.
- Réglages : nouveaux champs `miseEnEvidence` et `retraitAutoNotes` ; les réglages enregistrés à l'étape 3b
  sont complétés à la lecture (le thème choisi est conservé).
- Accueil : le bouton « Thème » est remplacé par « Statistiques » et « Réglages » (le thème est dans les réglages).
- Navigation : une seule entrée d'historique hors de l'accueil (partie, statistiques, fin de partie) ; le
  bouton retour d'Android ramène toujours à l'accueil.

### Vérifié
- Le worker n'est limité que par son budget de temps : aucune limite d'essais par défaut quand `doitArreter`
  est fourni (corrigé à l'étape 3b, tests existants dans `generation-niveau.test.ts` et `traitement.test.ts`).

## [Étape 3b — corrections] — Thème clair, génération sans limite d'essais — 2026-11-13

### Ajouté
- Bouton « Thème » sur l'accueil : Automatique (suit la tablette) → Clair → Sombre, enregistré dans les
  réglages ; la couleur de la barre d'état d'Android suit le thème choisi. Sur une tablette réglée en mode
  sombre, le thème clair Ardoise n'était jusqu'ici pas accessible.
- Tests : `tests/socle/theme.test.ts` ; génération limitée par le seul budget de temps (moteur et worker).

### Corrigé
- Génération dans le worker : `genererParNiveau` appliquait encore sa limite par défaut de 50 essais en plus
  du budget de temps (échec « Aucune grille … en 50 essais »). Désormais, quand `doitArreter` est fourni, le
  budget de temps est la seule limite ; sans budget (bench, script des packs), la limite de 50 essais
  (`TENTATIVES_MAX_SANS_BUDGET`) reste. `tentativesMax` accepte `null` (illimité, budget obligatoire).

## [Étape 3b] — Sudoku classique jouable — 2026-11-13

### Ajouté
- Module `src/games/sudoku-classique/` dans le registre : logique (génération et notation par le moteur,
  retrait automatique des notes de la ligne, de la colonne et du bloc quand un chiffre est posé, gardes,
  indice simple tiré du solveur logique), géométrie de la grille, vue tactile (mise en évidence de la ligne,
  de la colonne, du bloc et des chiffres identiques, y compris dans les notes ; flèches du clavier),
  conversion des packs Expert/Diabolique en `Puzzle`.
- Socle : `partie.ts` (partie en cours, pur), `stats.ts` (pur), `service-parties.ts`, `app.ts` (navigation,
  confirmation, chargement, bouton retour d'Android), `ecran-partie.ts` (barre, grille, outils, pavé avec
  chiffres restants, chrono branché sur la visibilité, pause qui masque la grille, sauvegarde après chaque
  action, fin de partie), `accueil.ts` (Continuer, choix du niveau), `dialogue.ts`, `chargement.ts`,
  `format.ts`, `dom.ts`.
- `main.ts` branche stockage IndexedDB (repli en mémoire), réglages, thème, worker, packs, réserve.
- Tests : `tests/games/sudoku-classique.test.ts`, `tests/socle/partie.test.ts`, `stats.test.ts`,
  `format.test.ts` (300 tests au total).

### Modifié
- Thème : direction visuelle « Ardoise » choisie par l'utilisateur (nouvelles variables : traits, zone,
  chiffres identiques, notes, voile…), couleurs de la barre d'état et du manifest.
- `StatsNiveau` : nouveau compteur `abandonnees` (partie remplacée par une nouvelle après confirmation) ;
  les temps ne portent que sur les parties terminées.
- Contrat des jeux : `ModuleJeu.chargerPack(niveau)` et `VueJeu.restants(etat, donnees)` ; module modèle adapté.
- Styles de base : accueil, écran de partie portrait/paysage, boutons, dialogues, chargement.
- docs : ARCHITECTURE.md, AJOUTER_UN_JEU.md, ROADMAP.md, CLAUDE.md.

## [Documentation] — Dépôt Sac2Riz — 2026-11-13

### Modifié
- Dépôt GitHub `Sac2Riz/Sac2Riz`, appli publiée à l'adresse https://sac2riz.github.io/Sac2Riz/ (étape 5) :
  CLAUDE.md, docs/ARCHITECTURE.md, docs/ROADMAP.md ; nom du paquet npm `sac2riz`.
- README.md réécrit en présentation de l'appli (affiché sur la page de profil GitHub).

## [Étape 3a] — Services sans interface — 2026-11-13

### Ajouté
- `src/socle/client-worker.ts` : client typé du worker (file à priorités urgent/fond, une demande à la fois,
  annulation par retrait de la file ou arrêt/recréation du worker, garde-fou si le worker ne répond plus,
  résultats `ok` / `echec` / `erreur` / `annule`) ; `calculs.ts` fournit la fabrique du vrai worker.
- `src/socle/stockage/` : interface `Stockage` (magasins `parties`, `reserve`, `packsJoues`, `stats`,
  `reglages`, prise atomique `prendrePremier`), implémentations IndexedDB et en mémoire, schéma versionné
  avec migrations (`VERSION_SCHEMA` = 1), demande de stockage persistant (`navigator.storage.persist()`).
- `src/socle/packs.ts` : grilles de pack jamais resservies avant épuisement, nouvel ordre ensuite.
- `src/socle/reserve.ts` : réserve de 3 grilles par jeu et par niveau ; `obtenirGrille` (réserve → pack →
  génération urgente relancée immédiatement) ; réalimentation en arrière-plan (jeu et niveau en cours, puis
  les autres niveaux du plus facile au plus difficile, puis les autres jeux), relance après 30 s / 2 min / 10 min.
- `src/socle/historique.ts` (annuler/rétablir), `chrono.ts` (pauses manuelle et automatique), `visibilite.ts`
  (surveillance de `visibilitychange`, à brancher en 3b), `environnement.ts` (minuteur et journal injectables).
- `src/worker/traitement.ts` : traitement des demandes du worker séparé de `postMessage` (testable).
- Types `EntreeReserve`, `EtatPack` ; gardes `src/utils/gardes-sauvegarde.ts` ; `estJson`, `estNombreEntre`.
- Tests : `tests/socle/` (client, stockage, schéma, persistance, packs, réserve, historique, chrono,
  visibilité), `tests/worker/traitement.test.ts`, gardes (266 tests au total).

### Modifié
- Génération limitée par un **budget de temps** : option `doitArreter` de `genererParNiveau`,
  `OptionsGeneration` du contrat des jeux (`doitArreter` remplace `tentativesMax`), message `generer` du
  worker avec `budgetMs` (4 s par défaut).
- docs/ROADMAP.md : étape 3 découpée en 3a / 3b / 3c ; ARCHITECTURE.md (services du socle), DIFFICULTE.md,
  AJOUTER_UN_JEU.md mis à jour.

## [Étape 2b] — Notation et génération par niveau — 2026-11-13

### Ajouté
- `src/moteur/notation.ts` : `noterGrille` / `noterEtapes` (niveau, force 1-10, technique max, détails ;
  `null` si essai-erreur), `mesurerNotation`, `calculerForce`, seuils `SEUILS_FORCE` mesurés
  (Débutant ≤ 39 chiffres ; Facile score ≥ 4 ou ≤ 30 ; Moyen score ≥ 4 ou ≤ 26 ; Difficile score ≥ 3 ou ≤ 26)
  et `VERSION_NOTATION` (= 1).
- `src/moteur/generation-niveau.ts` : `genererParNiveau` (refus des retraits qui dépassent le niveau,
  arrêt tôt Débutant 36-44 / Facile 30-35 chiffres, contrôle final du niveau, `tentativesMax`, symétrie).
- `src/types/pack.ts` (`PackSudoku`, `GrillePack`, `VERSION_FORMAT_PACK`) et `src/moteur/pack.ts`
  (garde `estPackSudoku`, `grilleEnTexte`, `texteEnGrille`).
- `npm run packs` (`scripts/generer-packs.ts`) : packs `expert.json` et `diabolique.json` de 200 grilles
  dans `src/games/sudoku-classique/packs/` (~81 et ~86 Ko, ~19 Ko compressés chacun).
- Tests : `notation.test.ts`, `generation-niveau.test.ts`, `pack.test.ts` (189 tests au total).

### Modifié
- `npm run bench` découpé en `scripts/bench/` et étendu : répartition des niveaux, génération par niveau
  (temps, essais, échecs, chiffres donnés ; Expert/Diabolique avec et sans symétrie), mesures de force.
  Options `--rapide` et `--n=<nombre>`.
- docs/DIFFICULTE.md : seuils de force, mesures, génération par niveau, packs, note sur le niveau Diabolique.

## [Étape 2a] — Solveur logique — 2026-11-13

### Ajouté
- `src/types/logique.ts` : `IDS_TECHNIQUES`, `EtatLogique`, `Etape` (technique, niveau, cases et candidats
  du motif, régions, placements, éliminations, explication en français), `ResultatLogique`.
- `src/moteur/logique/` : contexte précalculé (cases qui se voient, régions complètes), état (création,
  application d'une étape, détection des contradictions), noms des cases et régions, `construireEtape`
  (ne garde que les effets réels), outils et familles de techniques partagées.
- 21 techniques, une par fichier (`src/moteur/logique/techniques/`), de Débutant à Diabolique :
  dernier chiffre, singletons cachés et nus, paires/triplets/quadruplets nus et cachés, pointing, claiming,
  Skyscraper, 2-String Kite, X-Wing, Y-Wing, XYZ-Wing, Swordfish, X-Chain, XY-Chain, forcing simple.
  Toutes génériques (régions du moteur) : classique, diagonal, irrégulier, 6x6.
- `src/moteur/logique/solveur.ts` : `resoudreLogique` (statuts `resolu` / `bloque` / `contradiction`,
  `niveauMax`, garde-fou contre une étape sans effet) et `prochaineEtape` (pour les futurs indices).
- Tests : un fichier par technique sur des états préparés à la main (dont motifs sans effet pour paire nue
  et X-Wing), tests du solveur et du socle, test de sûreté comparé au backtracking (270 grilles dans
  `npm test`).
- Commande `npm run test:long` : test de sûreté sur 4100 grilles (~30 s) + couverture de chaque technique.

## [Étape 1] — Moteur de contraintes — 2026-11-13

### Ajouté
- `src/moteur/candidats.ts` : opérations sur les candidats en masques de bits.
- `src/moteur/regions.ts` : fabriques de régions (lignes, colonnes, blocs, diagonales, irrégulières, cages)
  et `definitionClassique(taille, hBloc, lBloc)`.
- `src/moteur/structure.ts` : vérification d'une définition de grille et précalcul des tables du solveur.
- `src/moteur/validation.ts` : `conflits`, `estComplete`, `estSolution`.
- `src/moteur/backtracking.ts` : comptage de solutions (heuristique MRV, arrêt à la limite, garde-fou
  `noeudsMax`, ordre aléatoire facultatif), `estUnique` ; gestion des cages (somme + chiffres distincts).
- `src/moteur/generateur.ts` : grille complète aléatoire, retrait de chiffres à solution unique
  (symétrie centrale par défaut ou aucune, `indicesMin`, fonction d'acceptation pour l'étape 2).
- Tests du moteur (`tests/moteur/`) : masques, régions, validation, unicité, cages, variantes 4x4/6x6/diagonal,
  reproductibilité, symétrie, fonction d'acceptation, performances.
- Script `npm run bench` (`scripts/bench.ts`) : temps de génération et de vérification d'unicité sur 100 grilles 9x9.

### Modifié
- `RegionSomme` : nouveau champ `distinctes` (chiffres distincts dans la cage, règle du Killer).

## [Étape 0] — Fondations — 2026-11-12

### Ajouté
- Dépôt Git (`main`), `.gitignore`, `.gitattributes` (fins de ligne LF), `.editorconfig`, réglages VS Code.
- Projet npm sans dépendance de production ; `typescript` et `@types/node` en développement.
- Configurations TypeScript strictes : appli (DOM), worker (WebWorker + code pur), tests et scripts (Node).
- Scripts Node : `copier-statiques.ts`, `serveur.ts`, `dev.ts`, `nettoyer.ts`.
- Commandes `npm run dev`, `build`, `typecheck`, `test`, `check`.
- Types partagés (`src/types/`) : JSON, niveaux, grille, contrat logique (`jeu.ts`), contrat d'affichage
  (`vue.ts`), sauvegardes, protocole du worker.
- Générateur pseudo-aléatoire à graine, gardes de validation JSON.
- Registre des jeux (vide) et module modèle `src/games/_modele/`.
- Page d'accueil minimale, thèmes clair/sombre, manifest et icône provisoire, worker squelette.
- Tests : générateur aléatoire, types partagés, registre, module modèle.
- Documentation : `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/DIFFICULTE.md`, `docs/AJOUTER_UN_JEU.md`, `docs/ROADMAP.md`.
