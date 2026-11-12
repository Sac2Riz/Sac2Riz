# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Une entrée par étape.

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
