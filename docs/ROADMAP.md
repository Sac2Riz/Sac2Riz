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

### Étape 3b — Sudoku classique jouable
- Module `sudoku-classique` (9x9) dans le registre (avec la conversion de ses packs en `Puzzle`).
- Accueil complet (Continuer, choix du niveau), écran de partie.
- Grille, pavé, mode notes, effacer, annuler/rétablir illimité, chrono avec pause (branché sur la visibilité).
- Sauvegarde automatique IndexedDB après chaque action, reprise de la partie.
- **Nouvelle partie alors qu'une partie est en cours sur ce jeu : demander une confirmation.**
  **À décider avec l'utilisateur : cela compte-t-il comme un abandon dans les statistiques ?**
- Optimisation tablette paysage/portrait.

### Étape 3c — Indices, erreurs, réglages, statistiques, fin de partie
- Indices expliqués (étapes du solveur logique, cases mises en évidence) avec compteur.
- Vérification des erreurs (réglage), écran des réglages, thème.
- Statistiques par jeu et par niveau.
- Écran de fin de partie (temps, force, indices, record).

## Étape 4 — Chiffres casés
- Grille type mots croisés, liste de nombres à placer (barrés une fois placés).
- Générateur avec solution unique garantie.
- Difficulté : taille, nombres de même longueur, nombres pré-placés.
- Pavé personnalisé (liste des nombres).

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
