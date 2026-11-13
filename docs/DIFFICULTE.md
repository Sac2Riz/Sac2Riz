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

En plus du niveau, chaque grille reçoit une **force** qui affine la position dans le niveau :

1. **Plage de base** : celle du niveau de la technique la plus dure (ex. Moyen → 5-6).
2. **Placement dans la plage** (niveaux à deux valeurs : Débutant, Facile, Moyen, Difficile) :
   la valeur haute est retenue si la grille est « dure pour son niveau », selon :
   - le **nombre de fois** où des techniques du niveau max (ou du niveau juste en dessous) sont nécessaires ;
   - le **nombre de chiffres donnés** (peu de chiffres → plus dur).
   Les seuils exacts seront fixés et testés à l'étape 2b, puis documentés ici.
3. Expert = 9 et Diabolique = 10 (plage d'une seule valeur).

La force est enregistrée dans `Notation` (`force`, `techniqueMax`, `details` = nombre d'utilisations de
chaque technique) et alimente la **force moyenne** des statistiques.

## Génération par niveau

- Débutant à Difficile : génération à la demande dans le worker, réserve de 2-3 grilles d'avance.
- **Expert et Diabolique** : génération en arrière-plan avec un nombre de **tentatives limité**
  (`tentativesMax`), plus un **pack JSON embarqué** de grilles pré-générées pour qu'une grille soit
  toujours disponible immédiatement.

## Jeux qui ne sont pas des sudokus

Ils utilisent **les mêmes 6 noms de niveaux** (interface cohérente) ; chaque module définit ses propres
critères et les documente ici.

### Chiffres casés (étape 4)
Critères : taille de la grille, nombre de nombres de même longueur (ambiguïté), nombre de nombres
pré-placés. Solution unique garantie. Barème à définir à l'étape 4.
