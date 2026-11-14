# Sac2Riz

**Jeux de logique à chiffres, pour tablette, sans publicité et 100 % hors ligne.**

Sac2Riz est une application web installable (PWA) pensée pour jouer tranquillement sur tablette Android :
une fois installée, elle fonctionne sans connexion, ne collecte aucune donnée et n'affiche aucune
publicité. Les parties sont sauvegardées automatiquement sur l'appareil.

▶️ **Jouer : [sac2riz.github.io/Sac2Riz](https://sac2riz.github.io/Sac2Riz/)** — *bientôt disponible*

## Les jeux

| Jeu | État |
|---|---|
| **Sudoku classique** (9×9) | en cours de développement |
| **Chiffres casés** : placer une liste de nombres dans une grille façon mots croisés | en cours de développement |
| **Variantes du sudoku** : 6×6, 4×4, diagonal, irrégulier, Killer, Windoku | prévu |
| **Kakuro** | prévu |

D'autres jeux de logique à chiffres viendront s'ajouter au fil du temps.

## Six niveaux de difficulté

Chaque grille est générée à la demande, avec une solution unique, puis notée selon les raisonnements
nécessaires pour la résoudre. Aucune grille n'exige de tâtonner au hasard.

| Niveau | | Ce qu'il faut savoir faire |
|---|---|---|
| Débutant | ★ | compléter une ligne presque pleine, balayer les blocs |
| Facile | ★★ | repérer la case qui n'admet plus qu'un chiffre |
| Moyen | ★★★ | paires de candidats, interactions entre bloc et ligne |
| Difficile | ★★★★ | triplets, quadruplets, Skyscraper, 2-String Kite |
| Expert | ★★★★★ | X-Wing, Y-Wing, Swordfish… |
| Diabolique | ★★★★★ | chaînes logiques |

Une note de force de 1 à 10 précise la difficulté à l'intérieur de chaque niveau.
Et aussi : notes (avec remplissage automatique), annuler et rétablir sans limite, indices expliqués pas à
pas, vérification des erreurs au choix, chronomètre, statistiques par niveau, thème clair ou sombre.

## Sous le capot

TypeScript strict, HTML et CSS, sans framework ni dépendance d'exécution. Les grilles sont générées dans un
Web Worker pour que l'interface reste fluide.

<details>
<summary>Développement</summary>

Prérequis : [Node.js](https://nodejs.org/) ≥ 22.18.

```sh
npm install      # installe TypeScript (outil de développement uniquement)
npm run dev      # compile en continu et sert l'appli sur http://localhost:8080
npm run check    # vérification des types + tests
```

Documentation : [architecture](docs/ARCHITECTURE.md) · [difficulté](docs/DIFFICULTE.md) ·
[ajouter un jeu](docs/AJOUTER_UN_JEU.md) · [feuille de route](docs/ROADMAP.md) ·
[journal des modifications](CHANGELOG.md)

</details>
