# Échelle de difficulté

Échelle en **6 niveaux**, inspirée des magazines, commune à tous les jeux (`src/types/niveaux.ts`).

## Principe (famille sudoku)

- Une grille est notée selon la technique **la plus avancée nécessaire** pour la résoudre.
- Le solveur logique applique **toujours** les techniques de la plus simple à la plus complexe, et revient à
  la plus simple dès qu'une technique a fait progresser la grille.
- Une grille qui exige du **pur essai-erreur** (aucune technique ne progresse) est **rejetée**.

## Les 6 niveaux

| # | Niveau | Force | Étoiles | Techniques (cumulatives) |
|---|---|---|---|---|
| 1 | **Débutant** | 1-2 | ★ | Dernier chiffre manquant d'une ligne/colonne/bloc ; singletons cachés trouvables par simple balayage des blocs. Beaucoup de chiffres donnés. |
| 2 | **Facile** | 3-4 | ★★ | + singletons nus ; singletons cachés sur toutes les régions. |
| 3 | **Moyen** | 5-6 | ★★★ | + paires nues et cachées ; interactions bloc-ligne (pointing / claiming). |
| 4 | **Difficile** | 7-8 | ★★★★ | + triplets et quadruplets nus et cachés ; motifs simples sur un chiffre (Skyscraper, 2-String Kite). |
| 5 | **Expert** | 9 | ★★★★★ | + X-Wing, Y-Wing, XYZ-Wing, Swordfish. |
| 6 | **Diabolique** | 10 | ★★★★★ + mention « Diabolique » | + chaînes logiques (X-Chain, XY-Chain, chaînes de forcing simples). |

## Techniques du solveur logique (étape 2a)

Une technique = un fichier `src/moteur/logique/techniques/<id>.ts` (avec son niveau) et un fichier de tests
`tests/moteur/logique/techniques/<id>.test.ts`. Ordre d'essai : celui du tableau (`IDS_TECHNIQUES`).
Une technique ne renvoie une étape que si elle a un **effet réel** (placement, ou élimination d'un
candidat encore présent) ; un motif sans effet est ignoré et la recherche continue.

Vocabulaire : deux cases **se voient** si elles partagent une région à chiffres distincts. Une région est
**complète** si elle a autant de cases que de valeurs (chaque valeur y est alors exactement une fois).
Un **lien fort** sur v : dans une région complète, v n'a plus que deux places (l'une des deux le contient).

| Niveau | Identifiant | Ce que fait la technique | Régions utilisées |
|---|---|---|---|
| Débutant | `dernier-chiffre` | Région complète avec une seule case vide → le chiffre manquant | toutes les complètes |
| Débutant | `singleton-cache-bloc` | Dans un bloc, un chiffre n'a qu'une place | blocs, régions irrégulières |
| Facile | `singleton-nu` | Case avec un seul candidat | — |
| Facile | `singleton-cache` | Dans une région, un chiffre n'a qu'une place | toutes les complètes |
| Moyen | `paire-nue` | 2 cases d'une région avec 2 candidats à elles deux → retirés du reste de la région | toute région distincte (cages comprises) |
| Moyen | `paire-cachee` | 2 chiffres qui n'ont que 2 places dans une région → ces cases ne gardent qu'eux | toutes les complètes |
| Moyen | `pointing` | Dans un bloc, un chiffre confiné à une autre région (ligne, colonne, diagonale) → retiré du reste de celle-ci | départ : bloc / irrégulière |
| Moyen | `claiming` | Dans une ligne, colonne ou diagonale, un chiffre confiné à un bloc → retiré du reste du bloc | départ : ligne / colonne / diagonale |
| Difficile | `triplet-nu`, `quadruplet-nu` | Comme la paire nue, avec 3 ou 4 cases | toute région distincte |
| Difficile | `triplet-cache`, `quadruplet-cache` | Comme la paire cachée, avec 3 ou 4 chiffres | toutes les complètes |
| Difficile | `skyscraper` | Deux liens forts dans deux lignes (ou deux colonnes), dont deux extrémités sont sur une même colonne (ou ligne) → l'une des deux autres extrémités contient v | lignes, colonnes |
| Difficile | `2-string-kite` | Un lien fort dans une ligne, un dans une colonne, reliés par deux extrémités d'un même bloc → idem | lignes, colonnes, blocs / irrégulières |
| Expert | `x-wing` | Dans 2 lignes, v confiné à 2 colonnes → retiré du reste de ces colonnes (et inversement) | lignes, colonnes |
| Expert | `y-wing` | Pivot {x,y} voyant deux pinces {x,z} et {y,z} → z retiré des cases qui voient les deux pinces | « se voient » |
| Expert | `xyz-wing` | Pivot {x,y,z} voyant {x,z} et {y,z} → z retiré des cases qui voient les trois | « se voient » |
| Expert | `swordfish` | Comme le X-Wing, avec 3 lignes et 3 colonnes | lignes, colonnes |
| Diabolique | `x-chain` | Chaîne sur un chiffre alternant liens forts et « se voient », d'au moins 3 liens → v retiré des cases qui voient les deux extrémités (la plus courte chaîne utile est retenue) | complètes + « se voient » |
| Diabolique | `xy-chain` | Chaîne d'au moins 3 cases à deux candidats, chacune voyant la suivante, qui ramène au chiffre de départ z → z retiré des cases qui voient les deux extrémités | « se voient » |
| Diabolique | `forcing-simple` | Case {x,y} : on suppose x puis y en ne posant que des singletons ; ce qui est vrai dans les deux cas est retenu. **Sans** raisonnement par contradiction (une hypothèse contradictoire fait passer à la case suivante) | toutes |

Remarques :
- Aucune technique n'est réservée au 9x9 classique. Celles qui citent des blocs ne se déclenchent pas sur
  une grille sans blocs ; les régions irrégulières jouent le rôle des blocs.
- Les **sommes** des cages Killer ne sont pas encore exploitées : sur un Killer, le solveur sera plus
  souvent bloqué tant que les techniques propres aux cages n'existent pas.
- Le **quadruplet caché** n'est jamais indispensable en pratique : dans une région à n cases vides, il
  équivaut à un sous-ensemble nu de n − 4 cases, trouvé avant lui. Il est testé sur des états préparés.
- Fréquence observée (test long, 4100 grilles minimales générées : classique, diagonal, irrégulier, 6x6) :
  ~89 % résolues par la logique, ~11 % bloquées ; aucune erreur de placement ou d'élimination.

## Score de force (1 à 10)

En plus du niveau, chaque grille reçoit une **force** qui affine la position dans le niveau
(`src/moteur/notation.ts`) :

1. **Plage de base** : celle du niveau de la technique la plus dure (ex. Moyen → 5-6).
2. **Placement dans la plage** (niveaux à deux valeurs : Débutant, Facile, Moyen, Difficile) :
   la valeur haute est retenue si la grille est « dure pour son niveau », c'est-à-dire si
   **score ≥ S ou chiffres donnés ≤ C**, avec :
   - **score** = nombre d'étapes du niveau max + ½ × nombre d'étapes du niveau juste en dessous ;
     ce niveau inférieur n'est compté **que s'il est au moins Moyen** : les singletons (Débutant, Facile)
     sont les étapes de « remplissage » de toute grille et ne disent rien de sa difficulté ;
   - **chiffres donnés** : peu de chiffres → plus dur.
3. Expert = 9 et Diabolique = 10 (plage d'une seule valeur).

### Seuils (figés à l'étape 2b, `SEUILS_FORCE`, `VERSION_NOTATION` = 1)

| Niveau | Force basse / haute | Force haute si | Part en force haute (mesurée) |
|---|---|---|---|
| Débutant | 1 / 2 | ≤ 39 chiffres donnés (score non utilisé : il vaut à peu près le nombre de cases vides) | 54 % |
| Facile | 3 / 4 | score ≥ 4 ou ≤ 30 chiffres | 52 % |
| Moyen | 5 / 6 | score ≥ 4 ou ≤ 26 chiffres | 53 % |
| Difficile | 7 / 8 | score ≥ 3 ou ≤ 26 chiffres | 53 % |

Les seuils visent environ une grille sur deux en force haute (mesure : `npm run bench`, 100 à 200 grilles
générées par niveau). Ils sont vérifiés par `tests/moteur/notation.test.ts`.

**`VERSION_NOTATION`** (`src/moteur/notation.ts`) : à **incrémenter** dès qu'un seuil, une technique ou
l'ordre des techniques change, puis régénérer les packs (`npm run packs`) : un pack d'une autre version
est refusé par sa garde de validation.

La force est enregistrée dans `Notation` (`force`, `techniqueMax`, `details` = nombre d'utilisations de
chaque technique) et alimente la **force moyenne** des statistiques.

### Note sur le niveau Diabolique

Le niveau Diabolique regroupe des grilles allant d'**une seule chaîne courte** à **plusieurs chaînes
longues**, avec une force fixe de 10 (mesure : de 1 à 9,5 étapes « score » selon les grilles). Si le
ressenti en jeu le justifie, une **graduation interne** pourra être ajoutée plus tard à partir du détail
des techniques (`details`), en incrémentant `VERSION_NOTATION`.

## Génération par niveau

`genererParNiveau` (`src/moteur/generation-niveau.ts`) : à chaque essai, une grille complète au hasard puis
un retrait de chiffres piloté par la fonction d'acceptation de `retirerChiffres` :

- un retrait est **refusé** si la grille n'est plus résoluble avec les techniques du niveau demandé
  (niveau dépassé ou essai-erreur nécessaire) ;
- **arrêt tôt** (Débutant, Facile) : le retrait s'arrête dès que le nombre de chiffres donnés atteint une
  cible tirée au hasard dans la plage du niveau (`CIBLES_ARRET_TOT`) :
  **Débutant 36-44, Facile 30-35** (sans arrêt tôt, ces grilles n'auraient que ~28-29 chiffres) ;
- **contrôle final** : la grille doit être exactement du niveau demandé (pas plus facile), sinon essai suivant,
  jusqu'à ce que `doitArreter()` réponde vrai (budget de temps du worker, consulté avant chaque essai sauf
  le premier ; c'est alors la **seule** limite) ou, sans budget (bench, script des packs), au plus
  `tentativesMax` essais (50 par défaut) ;
- **symétrie centrale** conservée pour tous les niveaux, Expert et Diabolique compris (sans symétrie : moins
  d'essais mais plus longs, temps moyen un peu plus élevé et pire cas nettement plus long).

Mesures (PC, sudoku 9x9, 100 grilles par niveau, graines 1 à 100, au plus 200 essais, aucun échec) :

| Niveau | Essais moy / max | Temps moy / max | Chiffres donnés moy (min-max) |
|---|---|---|---|
| Débutant | 1,0 / 1 | 4 / 8 ms | 39,4 (35-44) |
| Facile | 2,4 / 9 | 15 / 59 ms | 31,4 (29-35) |
| Moyen | 7,4 / 31 | 63 / 244 ms | 27,1 (23-31) |
| Difficile | 14,1 / 56 | 119 / 453 ms | 27,9 (23-31) |
| Expert | 17,6 / 75 | 159 / 641 ms | 27,9 (24-32) |
| Diabolique | 9,4 / 40 | 95 / 365 ms | 27,5 (24-32) |

Avec la limite par défaut de 50 essais (script des packs), environ 6 % des générations Expert échouent
(13 graines sur 213 lors de la génération du pack). Dans l'appli, le worker n'a pas de limite d'essais :
seul son budget de temps peut faire échouer une génération, et le pack prend alors le relais. Sur tablette, compter des temps 3 à 5 fois
plus longs.

Répartition des niveaux de grilles **minimales** générées au hasard (500 grilles, symétrie centrale) :
Débutant 11 %, Facile 53 %, Moyen 10 %, Difficile 5 %, Expert 5 %, Diabolique 10 %, essai-erreur 6 %.

### Utilisation dans l'appli (étape 3a)

- Dans le worker, la génération est limitée par un **budget de temps** (`budgetMs`, 4 s par défaut :
  pire cas PC ~0,65 s × 5 pour une tablette) plutôt que par un nombre d'essais fixe.
- **Réserve** de 3 grilles d'avance par jeu et par niveau, réalimentée en arrière-plan ; un échec
  (budget épuisé) est retenté après 30 s, 2 min, puis 10 min.
- Réserve vide : **pack JSON embarqué** s'il existe (Expert, Diabolique), sinon génération urgente relancée
  immédiatement jusqu'à réussir (Débutant à Difficile : quelques dixièmes de seconde).
- Détail des services : docs/ARCHITECTURE.md, « Services du socle ».

### Packs (`src/games/sudoku-classique/packs/`)

`expert.json` et `diabolique.json` : **200 grilles chacun**, générés par `npm run packs` (graines 1, 2, 3…,
~30 s et ~20 s sur PC). Taille : ~81 Ko et ~86 Ko (~415-440 octets par grille), **~19 Ko** chacun une fois
compressés (gzip, comme servis par GitHub Pages).

## Jeux qui ne sont pas des sudokus

Ils utilisent **les mêmes 6 noms de niveaux** (interface cohérente) ; chaque module définit ses propres
critères et les documente ici.

### Chiffres casés (étape 4)
Critères : taille de la grille, nombre de nombres de même longueur (ambiguïté), nombre de nombres
pré-placés. Solution unique garantie. Barème à définir à l'étape 4.
