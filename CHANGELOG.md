# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Une entrée par étape.

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
