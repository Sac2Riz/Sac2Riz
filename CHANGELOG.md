# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Une entrée par étape.

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
