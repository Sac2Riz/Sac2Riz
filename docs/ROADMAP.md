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
- Mise en page portrait/paysage, grandes touches ; bouton retour d'Android → accueil ; clavier physique.
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
  posé ailleurs est déplacé ; un nombre croisé contradictoire est retiré, avec un court signal visuel en 4b
  fourni par `consequencesPlacement`) et `effacer`. Nombres utilisés (à barrer), erreurs, fin de partie.
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

### Étape 4b — Interface et intégration
- `vue.ts`, `style.css` : grille, sélection d'un emplacement, saisie d'un nombre entier par la liste,
  liste des nombres groupés par longueur et barrés une fois utilisés, signal bref sur un nombre retiré,
  marques des indices ; une ligne dans `src/games/registre.ts` ; vérification dans Edge.
- **Changements du contrat acceptés sur le principe par l'utilisateur** (à condition de rester génériques,
  compatibles avec le sudoku et documentés dans AJOUTER_UN_JEU.md) :
  - la **zone du pavé confiée à la vue** quand elle choisit `{ type: 'personnalise' }` (aujourd'hui la vue
    ne reçoit que la zone de la grille et la zone du pavé reste vide) ;
  - une **option pour masquer des outils** du socle (ex. « Notes », sans objet aux chiffres casés).

## Étape 5 — PWA, sauvegarde externe, déploiement
- Service worker : mise en cache de tous les fichiers, 100 % hors ligne, mise à jour propre.
- **Icônes PNG 192×192 et 512×512, dont une version « maskable »**, nécessaires à l'installation sur
  Android (l'icône SVG provisoire suffit d'ici là).
- Export/import JSON de toutes les données, avec validation du fichier importé.
- GitHub Action : `npm ci`, `npm run check`, `npm run build`, publication de `dist/` sur GitHub Pages
  à chaque push sur `main`, à l'adresse https://sac2riz.github.io/Sac2Riz/.
- README : retirer la mention « bientôt disponible » du lien vers l'appli.
- Test d'installation sur la tablette.

## Étapes suivantes — Variantes et nouveaux jeux
- Sudoku 6x6 et 4x4, diagonal, irrégulier, Killer, Windoku.
- Kakuro.
- Autres jeux de logique à chiffres.
