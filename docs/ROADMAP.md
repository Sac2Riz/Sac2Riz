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

## ⏭️ Étape 2 — Solveur logique et notation
- Utiliser la fonction d'acceptation de `retirerChiffres` pour viser un niveau (arrêt tôt pour Débutant…).
- Une technique par fichier, avec son niveau et ses tests (voir docs/DIFFICULTE.md).
- Solveur logique (techniques de la plus simple à la plus complexe), rejet de l'essai-erreur.
- Calcul du niveau et de la force (seuils fixés et documentés).
- Script de génération de packs ; packs JSON Expert et Diabolique.
- Tests de cohérence de la notation.

## Étape 3 — Socle de l'interface + sudoku classique jouable
- Accueil complet (Continuer, choix du niveau), écran de partie.
- Pavé, mode notes, effacer, annuler/rétablir illimité, chrono avec pause, indices avec compteur.
- Vérification des erreurs (réglage), réglages, thème.
- Sauvegarde automatique IndexedDB, réserve de grilles d'avance, statistiques.
- Client du worker (génération à la demande, repli sur les packs).
- Module `sudoku-classique` (9x9) dans le registre.
- Optimisation tablette paysage/portrait.

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
  à chaque push sur `main`.
- Test d'installation sur la tablette.

## Étapes suivantes — Variantes et nouveaux jeux
- Sudoku 6x6 et 4x4, diagonal, irrégulier, Killer, Windoku.
- Kakuro.
- Autres jeux de logique à chiffres.
