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

## Techniques et identifiants (solveur logique, étape 2)

Une technique = un fichier `src/moteur/logique/techniques/<id>.ts`, avec son niveau et ses tests unitaires.

| Niveau | Identifiants prévus |
|---|---|
| Débutant | `dernier-chiffre`, `singleton-cache-bloc` |
| Facile | `singleton-nu`, `singleton-cache` |
| Moyen | `paire-nue`, `paire-cachee`, `pointing`, `claiming` |
| Difficile | `triplet-nu`, `triplet-cache`, `quadruplet-nu`, `quadruplet-cache`, `skyscraper`, `2-string-kite` |
| Expert | `x-wing`, `y-wing`, `xyz-wing`, `swordfish` |
| Diabolique | `x-chain`, `xy-chain`, `forcing-simple` |

## Score de force (1 à 10)

En plus du niveau, chaque grille reçoit une **force** qui affine la position dans le niveau :

1. **Plage de base** : celle du niveau de la technique la plus dure (ex. Moyen → 5-6).
2. **Placement dans la plage** (niveaux à deux valeurs : Débutant, Facile, Moyen, Difficile) :
   la valeur haute est retenue si la grille est « dure pour son niveau », selon :
   - le **nombre de fois** où des techniques du niveau max (ou du niveau juste en dessous) sont nécessaires ;
   - le **nombre de chiffres donnés** (peu de chiffres → plus dur).
   Les seuils exacts sont fixés et testés à l'étape 2, puis documentés ici.
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
