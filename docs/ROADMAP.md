# Feuille de route

Règle : **une étape à la fois**, avec le feu vert de l'utilisateur avant de passer à la suivante.
Fin de chaque étape : `npm run check` vert, mise à jour de CLAUDE.md, ROADMAP.md, CHANGELOG.md, puis commit.

## ✅ Étape 0 — Fondations
- Dépôt Git, `.gitignore`, identité Git locale (Sac2Riz, adresse noreply).
- npm + TypeScript (+ `@types/node` pour tests et scripts), 4 configurations TypeScript.
- Scripts sans dépendance : copie des statiques, serveur local, mode dev.
- Types partagés, contrat des modules de jeu, registre vide, module modèle `_modele`.
- Page d'accueil minimale, thème clair/sombre, worker squelette (ping).
- Tests d'exemple ; documentation (CLAUDE.md, docs/, CHANGELOG.md).

## ✅ Étape 1 — Moteur de contraintes
- Fabriques de régions (lignes, colonnes, blocs, diagonales, irrégulières, cages à chiffres distincts).
- Candidats en masque de bits.
- Solveur par backtracking (comptage de solutions, arrêt à 2) → vérification d'unicité.
- Générateur : grille complète aléatoire puis retrait de chiffres en gardant une solution unique
  (symétrie centrale par défaut, fonction d'acceptation pour piloter le retrait selon le niveau).
- Tests : unicité, validité des grilles générées, reproductibilité par graine, performances raisonnables.
- Script de mesure `npm run bench` : ~1,3 ms en moyenne par grille 9x9 sur PC (max ~4,5 ms).

## Étape 2 — Solveur logique et notation (découpée en deux sous-étapes, un commit chacune)

### ✅ Étape 2a — Solveur logique
- Types `EtatLogique`, `Etape`, `ResultatLogique` (`src/types/logique.ts`) ; contexte, état, noms (`src/moteur/logique/`).
- 21 techniques, une par fichier, avec leur niveau (voir docs/DIFFICULTE.md) ; chaque technique renvoie une
  « étape » expliquée en français, uniquement si elle a un effet réel.
- Solveur : techniques de la plus simple à la plus dure, arrêt propre « bloque » (essai-erreur nécessaire),
  détection des contradictions, `niveauMax`, garde-fou contre les étapes sans effet.
- Tests : une technique = un fichier de tests sur états préparés à la main ; test de sûreté sur grilles
  générées (classique, diagonal, irrégulier, 6x6) comparé au backtracking ; version longue `npm run test:long`
  (4100 grilles + couverture de chaque technique).
- Note pour la variante irrégulière : la génération d'une grille complète par backtracking y est parfois très
  lente (plusieurs secondes) ; à traiter quand cette variante sera ajoutée.

### ✅ Étape 2b — Notation et génération par niveau
- `noterGrille` (`src/moteur/notation.ts`) : niveau (technique la plus dure) + force 1-10 ; seuils mesurés
  (~50 % de force haute par niveau), documentés, testés ; `VERSION_NOTATION`.
- `genererParNiveau` (`src/moteur/generation-niveau.ts`) via la fonction d'acceptation de `retirerChiffres` :
  refus si le niveau est dépassé, arrêt tôt Débutant (36-44 chiffres) / Facile (30-35), contrôle final du
  niveau, `tentativesMax`. Symétrie centrale conservée pour tous les niveaux.
- `npm run packs` : packs `expert.json` et `diabolique.json` (200 grilles chacun, ~19 Ko compressés) dans
  `src/games/sudoku-classique/packs/`, garde `estPackSudoku` (format et version de notation).
- `npm run bench` étendu : répartition des niveaux, temps/essais/échecs/chiffres par niveau, mesures de force.
- Tests : notation (seuils, cohérence, rejet), génération par niveau, packs (garde, unicité, notation, graines).
- Piste : graduation interne du niveau Diabolique si le ressenti en jeu le justifie (voir DIFFICULTE.md).

## Étape 3 — Socle de l'interface + sudoku classique jouable (découpée en trois sous-étapes, un commit chacune)

### ✅ Étape 3a — Services sans interface
- Génération avec **budget de temps** : `doitArreter` dans `genererParNiveau` et dans le contrat
  (`OptionsGeneration`), message `generer` du worker avec `budgetMs`.
- Client du worker typé : file à priorités (urgent / fond), une demande à la fois, annulation (retrait de
  la file, ou arrêt et recréation du worker si la demande est en cours), garde-fou si le worker ne répond plus.
- Stockage derrière une interface (`Stockage`) : implémentation IndexedDB (stockage persistant demandé au
  navigateur) et implémentation en mémoire pour les tests ; magasins `parties` (une par jeu), `reserve`,
  `packsJoues`, `stats`, `reglages` ; version du schéma et migrations ; gardes de type à la relecture.
- Réserve de 3 grilles par jeu et par niveau, prise atomique (jamais servie deux fois), réalimentation en
  arrière-plan (jeu et niveau en cours d'abord, puis les autres niveaux du plus facile au plus difficile),
  nouvelle tentative après 30 s / 2 min / 10 min en cas d'échec.
- Grille demandée par le joueur : réserve, sinon pack, sinon génération urgente relancée immédiatement
  jusqu'à réussir ou être annulée.
- Packs : grilles déjà jouées mémorisées, nouvel ordre quand le pack est épuisé.
- Historique annuler/rétablir et chronomètre (pauses manuelle et automatique) en code pur ;
  mécanisme de surveillance de la visibilité de l'appli (branché en 3b).
- Tests pour chaque service (266 tests au total) ; implémentation IndexedDB et vrai worker vérifiés aussi
  dans Edge (page de test jetable, non conservée).

### ✅ Étape 3b — Sudoku classique jouable
- Direction visuelle choisie : **« Ardoise »** (gris bleutés, accent bleu encre, police du système), clair et sombre.
- Module `sudoku-classique` (9x9) dans le registre, avec la conversion de ses packs en `Puzzle`
  (`chargerPack` ajouté au contrat `ModuleJeu`).
- Accueil (Continuer avec niveau et temps, choix du niveau), écran de partie.
- Toucher une case puis un chiffre ; mise en évidence de la ligne, de la colonne, du bloc et des chiffres
  identiques (y compris dans les notes) ; notes retirées automatiquement de la ligne, de la colonne et du bloc
  quand un chiffre est posé ; mode notes, effacer, annuler/rétablir illimité ; chiffres restants sur le pavé.
- Chrono avec pause manuelle (grille masquée) et pause automatique quand l'appli passe en arrière-plan.
- Indicateur de chargement (avec Annuler) pendant une génération urgente.
- Sauvegarde automatique après chaque action (et au passage en arrière-plan), reprise par « Continuer ».
- Nouvelle partie alors qu'une partie est en cours : confirmation ; **décision de l'utilisateur** : la partie
  remplacée compte comme **abandonnée** (compteur séparé `abandonnees`) ; meilleurs temps et temps moyens ne
  portent que sur les parties terminées.
- Mise en page portrait/paysage, grandes touches ; bouton retour d'Android → accueil (→ fiche du jeu depuis
  l'étape 6a) ; clavier physique.
- Fin de partie minimale (statistiques enregistrées, message « Bravo ») ; l'écran complet reste en 3c.
- Tests : sudoku (règles, retrait des notes, gardes, indices, pavé, packs), partie, statistiques, service des
  parties, format (300 tests) ; parcours complet vérifié dans Edge (portrait, paysage, clair, sombre).
- Corrections après test sur tablette : choix du thème (Automatique / Clair / Sombre) depuis l'accueil,
  enregistré ; le worker n'est plus limité que par son budget de temps (plus de limite de 50 essais).

### ✅ Étape 3c — Indices, erreurs, réglages, statistiques, fin de partie
- **Indices en deux temps** : 1) mise en évidence (régions, cases et candidats du motif, éliminations barrées,
  chiffre à placer) et explication de la technique dans un bandeau ; 2) « Appliquer » joue le placement ou les
  éliminations (annulable). Compteur d'indices : +1 dès que l'indice est montré (**décision de
  l'utilisateur**). Le solveur part des chiffres posés et des notes fiables du joueur ; un chiffre faux est
  signalé en premier.
- **Vérification des erreurs** (réglage) : chiffres faux en rouge, par comparaison avec la solution.
- **Remplir les notes** : une seule action annulable qui **remplace** les notes des cases vides par tous
  leurs candidats (**décision de l'utilisateur**).
- **Réglages** (fenêtre, depuis l'accueil et la partie) : vérification des erreurs, mise en évidence, retrait
  automatique des notes, thème (repris de l'accueil). Réglages de l'étape 3b complétés à la lecture.
- **Statistiques** par jeu et par niveau : terminées, abandonnées, meilleur temps, temps moyen, force moyenne.
- **Fin de partie** : temps, niveau, force, technique la plus difficile, indices, record. Une partie terminée
  avec indices compte mais ne peut pas battre le record.
- Contrat : `Indice` en deux temps, `indice(etat, donnees, options)`, `remplirNotes` (facultatif),
  `nomTechnique`, `afficher({ … })`, `contexte.reglages()`. Actions du sudoku `placer-seul` et
  `definir-notes` (anciennes parties toujours lisibles, `versionFormat` inchangé).
- Vérifié : le worker n'est limité que par son budget de temps (aucune limite d'essais par défaut ; tests
  dans `generation-niveau.test.ts` et `traitement.test.ts`).
- Retraits après test sur tablette : nombre de chiffres restants sur les touches du pavé (la touche reste
  estompée quand le chiffre est posé partout) ; bouton « Remplir les notes » et `remplirNotes` du contrat
  (`definir-notes` gardée pour les indices ; anciennes parties toujours rejouables, testé).
- Tests : indices (dont éliminations et notes du joueur), remplir les notes, nouvelles actions, réglages,
  statistiques et record, compteur d'indices, bilan de fin (326 tests) ; parcours vérifié dans Edge.

## Étape 4 — Chiffres casés (découpée en deux sous-étapes, un commit chacune)

Second jeu, test de l'architecture : il s'ajoute en suivant docs/AJOUTER_UN_JEU.md, sans modifier le socle
(toute modification du socle ou du contrat est d'abord expliquée à l'utilisateur).

### ✅ Étape 4a — Logique pure
- Module `src/games/chiffres-cases/` (non enregistré dans le registre avant la 4b) : modèle de grille
  (emplacements déduits des cases noires, liste des nombres déduite de la solution), D/E/A, gardes.
- Actions : `placer` (nombre entier dans un emplacement ; **décisions de l'utilisateur** : un nombre déjà
  posé ailleurs est déplacé ; un nombre croisé contradictoire était retiré — **remplacé après la 4b** : la
  pose est refusée, voir ci-dessous) et `effacer`. Nombres utilisés (à barrer), erreurs, fin de partie.
- Générateur : motif symétrique et connexe, chiffres au hasard, « marche » de petites modifications vers
  les grilles dures, pré-placés selon le niveau ; solution unique prouvée par la résolution logique.
- Solveur logique « humain » (une technique par fichier), notation (niveau + force), indices en deux temps
  (toujours un placement : le joueur ne prend pas de notes).
- Bench (`npm run bench -- --jeu=chiffres-cases`), tests (dont le contrat appliqué à la logique seule)
  et test long de sûreté.
- Calibrage validé par l'utilisateur : graduation des croisements par longueur des listes (Moyen ≤ 3,
  Difficile ≤ 4, Expert sans limite), hypothèses en Diabolique avec **impasse bornée** (au plus 3 déductions
  simples), Diabolique en 11 × 11, seuils de force (Débutant : groupe ≥ 9).
- Packs de 200 grilles Expert et 200 Diabolique (format propre au jeu, `npm run packs -- --jeu=chiffres-cases`).
- **Changement du socle validé par l'utilisateur** : `MetaJeu.generation` (niveau servi uniquement par son
  pack ; budget de fond plus long, par jeu et par niveau), budget par demande dans le client du worker,
  réserve qui en tient compte. Chiffres casés : Diabolique servi par son pack, Expert réalimenté avec 30 s.
- `npm test` ramené sous 10 s : les niveaux Expert et Diabolique ne sont contrôlés que par `npm run test:long`.

### ✅ Étape 4b — Interface et intégration
- `vue.ts`, `style.css`, `interaction.ts` (logique des touchers, pure et testée) ; une ligne dans
  `src/games/registre.ts` : l'accueil propose deux jeux, chacun avec son « Continuer » et ses niveaux.
- Emplacement d'abord : toucher une case sélectionne son emplacement (l'horizontal d'abord, toucher à
  nouveau bascule sur le vertical), puis un nombre de la bonne longueur le remplit (autres longueurs
  estompées, sans effet). **Décision de l'utilisateur** : nombre d'abord aussi — sans sélection, toucher un
  nombre met en évidence les emplacements vides de sa longueur ; toucher l'un d'eux l'y place ; toucher à
  nouveau le nombre ou une zone vide annule.
- Liste groupée par longueur (groupe visé surligné ; d'abord placé en tête, puis laissé à sa place — voir
  les corrections ci-dessous), nombres utilisés barrés et déplaçables,
  pré-placés distincts et verrouillés, « Effacer » ; signal bref sur un nombre déplacé ou retiré.
- Indices, erreurs, réglages, chrono, sauvegarde, statistiques, fin de partie : socle commun.
- **Changements du contrat acceptés par l'utilisateur** (génériques, sudoku inchangé, documentés dans
  AJOUTER_UN_JEU.md) : `monter(zones, contexte)` avec la **zone du pavé confiée à la vue** pour un pavé
  `personnalise` ; `outilsMasques` (les chiffres casés masquent « Notes »).
- Tests : interaction (19 tests), outils, configuration de la vue dans les tests du registre (439 tests).
- Vérifié dans Edge (tablette simulée 1280 × 800 et 800 × 1280, clair et sombre) : grille 11 × 11 et liste
  complète lisibles, sélection, nombre d'abord, signal, indice, pause, deux « Continuer » ; sudoku inchangé.
- Vérifié : compteur des touches et « Remplir les notes » bien retirés depuis la 3c ; `restants` gardé
  (estompe une touche épuisée).
- **Corrections après les essais sur tablette (demandées par l'utilisateur)** :
  - cases noires de la couleur du fond de l'appli (`--couleur-case-noire: var(--couleur-fond)`) ; la grille
    se lit par le contour des cases blanches, en clair et en sombre ;
  - pose définitive dès le toucher qui la fait, dans les deux façons de jouer : la sélection est levée
    (elle restait active, et le nombre posé apparaissait « choisi » au lieu de barré : la pose semblait
    attendre une validation, alors qu'elle était déjà jouée et sauvegardée) ;
  - un nombre qui contredit un nombre croisé (pré-placé ou non) **n'est plus posé** et le nombre croisé
    n'est plus retiré : les cases en conflit clignotent (3 pulsations, ~1 s) ; un déplacement en conflit
    laisse le nombre à son ancien emplacement. Indice inchangé : il ne propose jamais de pose en conflit.
  - Tests : interaction (24 tests), règles ; 445 tests. Vérifié dans Edge (portrait, paysage, clair, sombre).
  - réglage « Toujours placer un nombre au départ » (désactivé par défaut) : une nouvelle grille sans
    pré-placé en reçoit un, choisi pour la meilleure ouverture en gardant le niveau (`depart.ts`, mesures dans
    DIFFICULTE.md) ; contrat logique `preparer`, demande `preparer` au worker (second worker dédié).
    Tests : 460. Vérifié dans Edge (réglage conservé, partie en cours inchangée, sudoku inchangé).
  - la liste des nombres ne change jamais d'ordre (longueurs croissantes) : le groupe visé est seulement
    surligné ; s'il est hors de vue, la liste défile doucement juste assez pour le montrer
    (`defilementPourVoir`, pur et testé), sinon rien ne bouge.

## ✅ Étape 5 — PWA, sauvegarde externe, déploiement
- Icônes provisoires (le design complet sera refait) : SVG, PNG 192 et 512, 512 « maskable », générées par
  `npm run icones` (script Node sans dépendance, relançable quand le design change).
- Service worker : tous les fichiers (packs compris) en cache, 100 % hors ligne ; liste et version écrites
  automatiquement au build (empreinte du contenu) ; anciens caches supprimés ; IndexedDB jamais touché.
- Mise à jour : bandeau « Nouvelle version disponible » (Recharger / Plus tard), jamais de rechargement
  automatique ; la partie en cours est sauvegardée avant de recharger.
- Export/import JSON (Réglages → Sauvegarde) : fichier daté ; import depuis l'accueil, validation complète
  (fichier invalide ou version inconnue refusé avec un message, rien n'est modifié), confirmation, écriture
  atomique, redémarrage. **Décisions** : la réserve n'est pas exportée (régénérée toute seule) ;
  l'avancement dans les packs l'est.
- GitHub Action : `npm ci`, `npm run check`, `npm run build`, publication de `dist/` sur GitHub Pages
  à chaque push sur `main` (seulement si tout passe), https://sac2riz.github.io/Sac2Riz/.
- README : mention « bientôt disponible » retirée une fois l'appli en ligne.
- Vérifié dans Edge automatisé (installation, hors ligne, import, mise à jour). Test sur la tablette :
  installation, mode avion, reprise, export/import, réception d'une mise à jour.

## Étape 6 — Refonte de l'interface (découpée en trois sous-étapes, un commit chacune)

### ✅ Étape 6a — Structure des écrans et des réglages (dans le style actuel « Ardoise »)
- **Accueil** : liste des jeux (nom, description courte, pastille discrète « Partie en cours ») ; plus de
  partie lancée depuis l'accueil ; Statistiques (tous les jeux) et Réglages.
- **Fiche d'un jeu** (nouvel écran) : nom et description, aperçu en petit non jouable (partie en cours,
  sinon grille d'exemple), « Continuer » (niveau, force, temps), « Nouvelle partie » avec le choix du
  niveau, règles expliquées simplement, statistiques de ce jeu.
- **Contrat** (générique, documenté dans AJOUTER_UN_JEU.md) : fichier `fiche.ts` par jeu (`FicheJeu` :
  `regles`, `exemple`), `ModuleJeu.chargerFiche`, `VueJeu.apercu` (grille en lecture seule) ; réglages
  propres déclarés par chaque jeu (`MetaJeu.reglages`, `ReglageJeu` : libellé, type, valeur par défaut,
  `preparation`), transmis à `indice`, `preparer` et à la vue (`ValeursReglagesJeu`).
- **Niveaux avec leur force** à la place des étoiles, partout : « Débutant · Force 1-2 » … « Diabolique ·
  Force 10 » ; force exacte de la grille pendant la partie, dans « Continuer » et en fin de partie
  (« Moyen · Force 6 »).
- **Réglages en trois sections** : Application (thème, sauvegarde, version), Tous les jeux (vérification
  des erreurs, mise en évidence), Par jeu (sudoku : retrait automatique des notes ; chiffres casés : nombre
  au départ) ; pendant une partie, seulement le jeu en cours. **Décisions de l'utilisateur** : mise en
  évidence dans « Tous les jeux » ; la version affiche la date et l'heure du build avec l'empreinte
  (« 14/11/2026 17:30 · a1b2c3d4 »), date figée par les sources (deux builds identiques = même version).
- **Migration** des réglages enregistrés (formes à plat V1 à V3 → réglages par jeu), testée ; export
  n° 2, import des fichiers n° 1 et n° 2.
- **Navigation** : bouton retour d'Android partie → fiche du jeu → accueil ; fin de partie : « Nouvelle
  partie » et « Retour » (vers la fiche).
- **Accueil en grille de cartes** (demande de l'utilisateur après la 6a) : 3 colonnes en paysage sur
  tablette, 2 en portrait, 1 sur un écran très étroit (grille CSS `auto-fill`), cartes de même hauteur par
  rangée, entièrement touchables, avec un petit aperçu du jeu (`vue.apercu` : partie en cours ou exemple).
  Vérifié dans Edge : 1280 × 800, 800 × 1280 (sombre), 400 × 860 ; toucher l'aperçu ouvre la fiche.
- Tests (525) ; vérifié dans Edge en tablette simulée (1280 × 800 clair, 800 × 1280 sombre) : migration
  d'anciens réglages, accueil, fiches (exemple et partie en cours), réglages, partie, retour à chaque
  niveau, partie finie et écran de fin, statistiques, nombre au départ.

### Étape 6b — Directions de design
- 7 directions de design proposées comme **thèmes** sur la vraie appli, pour que l'utilisateur choisisse.

### Étape 6c — Finalisation du design choisi
- Finalisation de la direction retenue (et des icônes).

## Étapes suivantes — Variantes et nouveaux jeux
- Sudoku 6x6 et 4x4, diagonal, irrégulier, Killer, Windoku.
- Kakuro.
- Autres jeux de logique à chiffres.
