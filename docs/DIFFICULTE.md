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

### Chiffres casés (étape 4a)

Grille rectangulaire à cases noires ; chaque **emplacement** (suite d'au moins 2 cases blanches, horizontale
ou verticale) reçoit un nombre de la liste, chacun exactement une fois. Solution unique garantie
(backtracking), grille connexe et symétrique. Code : `src/games/chiffres-cases/` (solveur dans `solveur/`,
notation dans `notation.ts`, `VERSION_NOTATION_CASES` = 1).

#### Solveur logique « humain »

État : pour chaque emplacement, les nombres encore possibles (de sa longueur). Placer un nombre le retire
des autres emplacements de même longueur et filtre les emplacements croisés (chiffre commun imposé).
Comme pour le sudoku : techniques essayées de la plus simple à la plus dure, retour à la plus simple après
chaque progrès, étape renvoyée seulement si elle a un effet réel, grille rejetée si la logique bloque.

La vraie difficulté pour un joueur est la **longueur des listes à comparer** : les croisements sont donc
gradués selon le nombre de possibilités de l'emplacement de départ.

| Niveau | Identifiant | Ce que fait la technique |
|---|---|---|
| Débutant | `longueur-unique` | Le dernier nombre d'une longueur va dans le dernier emplacement de cette longueur |
| Débutant | `motif-unique` | Un emplacement n'a plus qu'un nombre possible (souvent grâce aux chiffres déjà écrits par les croisements) |
| Facile | `place-unique` | Un nombre ne peut aller que dans un seul emplacement |
| Moyen | `croisement` | Un emplacement qui n'a plus que 2 ou 3 nombres possibles impose ses chiffres à la case de croisement : on élimine les nombres de l'emplacement croisé qui n'y mettent pas un de ces chiffres |
| Difficile | `groupe-nu` | k emplacements de même longueur (2 à 4) se partagent exactement k nombres : retirés des autres emplacements |
| Difficile | `groupe-cache` | k nombres (2 à 4) ne vont que dans k emplacements : ces emplacements ne gardent qu'eux |
| Difficile | `croisement-etendu` | Croisement depuis une liste de 4 nombres au plus |
| Expert | `croisement-complet` | Croisement depuis une liste de n'importe quelle longueur |
| Diabolique | `consequence` | Un emplacement à 2 possibilités : chacune est suivie avec les déductions simples (voir l'impasse bornée ci-dessous) |
| Diabolique | `forcing` | « Hypothèses » : un emplacement à 2 ou 3 possibilités, ou un nombre à 2 ou 3 places ; dans chaque cas, toutes les techniques jusqu'à Expert ; ce qui est vrai dans tous les cas est retenu |

#### Diabolique : l'impasse bornée (différence avec le sudoku)

Au sudoku, `forcing-simple` n'utilise **jamais** le raisonnement par contradiction : une hypothèse qui
aboutit à une impasse fait seulement passer à la case suivante, car « essayer jusqu'à tomber sur une
impossibilité » revient à de l'essai-erreur.

Aux chiffres casés, une possibilité qui mène à une impasse **est éliminée**, mais seulement si l'impasse
apparaît après une propagation **courte et bornée** : au plus **3 déductions simples**
(`IMPASSE_ETAPES_MAX`, techniques Débutant et Facile seulement : `TECHNIQUES_IMPASSE` dans
`solveur/hypotheses.ts`). Exemple d'explication : « Le vertical en L1C4 ne peut recevoir que 345 ou 367.
Mais si 367 y allait, on aboutirait immédiatement à une impasse (un emplacement sans nombre possible) :
367 est donc impossible dans le vertical en L1C4. » Une impasse plus lointaine n'est jamais exploitée : le
choix est abandonné (pas de conclusion tirée d'une branche longue).

Pourquoi cette différence :
- **Sans elle, ces techniques ne servent presque jamais** : le cas « toutes les possibilités mènent à la
  même conclusion » est quasi inexistant dans ce jeu (mesure de l'étape 4a), et le niveau Diabolique serait
  vide.
- **C'est un raisonnement que le joueur fait de tête** : poser un nombre de 3 ou 4 chiffres écrit d'un coup
  plusieurs chiffres dans les emplacements croisés, et l'impasse se voit souvent tout de suite (un
  emplacement croisé ne peut plus recevoir aucun nombre). Au sudoku, une contradiction n'apparaît qu'au bout
  de longues chaînes de singletons.
- **La borne empêche l'essai-erreur déguisé** : jamais de résolution complète d'une branche pour trouver
  une contradiction.

Mesure (40 grilles Difficile résolues pas à pas : à chaque situation, la plus courte impasse disponible) :
0 déduction (immédiate) dans 2 318 situations, 1 dans 31, 2 dans 8, 3 dans 6, et au-delà de 3 dans
19 (5, 8 ou 20 déductions). La borne de 3 garde donc **98,8 %** des impasses. Sur la génération, son effet
est nul : avec une borne de 0, 2, 3, 5 ou sans borne, les 10 premières graines Expert et Diabolique
donnent les mêmes grilles avec le même nombre d'essais.

#### Force (1 à 10)

Même principe que le sudoku : Expert = 9, Diabolique = 10 ; pour les autres niveaux, valeur haute si la
grille est « dure pour son niveau » (`SEUILS_FORCE_CASES`, figés à l'étape 4a après validation) :
- **score** = étapes du niveau max + ½ × étapes du niveau juste en dessous (compté seulement s'il est au
  moins Moyen) ;
- **groupe** = taille du plus grand groupe de nombres de même longueur (plus il est grand, plus il y a
  d'hésitation). En Débutant et Facile, le score ne distingue pas les grilles (il compte les étapes de
  remplissage) : c'est le groupe qui joue.

| Niveau | Force basse / haute | Force haute si | Part en force haute (200 grilles) |
|---|---|---|---|
| Débutant | 1 / 2 | plus grand groupe ≥ 9 | 36 % |
| Facile | 3 / 4 | plus grand groupe ≥ 13 | 45 % |
| Moyen | 5 / 6 | score ≥ 6 | 52 % |
| Difficile | 7 / 8 | score ≥ 11 | 48 % |

#### Génération par niveau

`genererCases` (`generateur.ts`) : motif de cases noires par paires symétriques (densité selon le niveau,
suites trop longues coupées, cases isolées noircies, grille connexe exigée), chiffres au hasard (sans 0 en
tête, tous les nombres différents), puis une **marche** de petites modifications (changer quelques
chiffres, « rapprocher » deux nombres de même longueur, ajouter ou retirer un pré-placé) qui garde la grille
la plus proche du niveau visé. Au-delà de Difficile, le backtracking écarte les grilles ambiguës avant les
techniques coûteuses. `doitArreter()` est consulté entre deux pas de la marche.

| Niveau | Grille | Cases noires | Longueur max | Pré-placés |
|---|---|---|---|---|
| Débutant | 7 × 7 | 30 % | 5 | 2 à 3 |
| Facile | 9 × 9 | 30 % | 6 | 1 à 2 |
| Moyen | 9 × 9 | 28 % | 6 | 0 à 1 |
| Difficile | 11 × 11 | 25 % | 7 | 0 à 1 |
| Expert | 11 × 11 | 22 % | 7 | 0 à 1 |
| Diabolique | 11 × 11 | 22 % | 7 | 0 à 1 |

Mesures (`npm run bench -- --jeu=chiffres-cases`, PC, graines 1, 2, 3… : 100 grilles par niveau, 30 en
Expert, 20 en Diabolique ; au plus 1000 essais ; **aucun échec**). Temps sur machine libre ; le bench refait
après l'ajout de la borne d'impasse (pendant la génération des packs, machine chargée) donne les **mêmes
grilles et les mêmes essais**, avec des temps environ doublés à tous les niveaux.

| Niveau | Essais moy / max | Temps moy / méd / max | Nombres moy (min-max) | Plus grand groupe | Pré-placés | Cases non croisées |
|---|---|---|---|---|---|---|
| Débutant | 1,0 / 2 | 0 / 0 / 3 ms | 17,4 (12-23) | 8,3 (4-16) | 2,2 | 29 % |
| Facile | 3,5 / 16 | 12 / 9 / 68 ms | 29,8 (24-36) | 13,0 (6-20) | 1,4 | 25 % |
| Moyen | 1,0 / 3 | 1 / 1 / 7 ms | 28,9 (22-34) | 12,0 (6-20) | 0,4 | 25 % |
| Difficile | 3,4 / 11 | 87 / 62 / 391 ms | 44,5 (36-53) | 16,0 (8-26) | 0,2 | 20 % |
| Expert | 11,8 / 28 | 0,7 / 0,7 / 1,7 s | 45,5 (37-52) | 15,4 (10-22) | 0 | 19 % |
| Diabolique | 27,8 / 110 | 5,5 / 3,3 / 23 s | 45,9 (41-52) | 16,6 (12-22) | 0,1 | 19 % |

Techniques utilisées en Diabolique (part des grilles) : conséquences directes 95 %, hypothèses 20 %.

#### Utilisation dans l'appli

- Débutant à Difficile : générés dans le worker (budget de 4 s, largement suffisant).
- **Expert** : pack de 200 grilles servi quand la réserve est vide ; la réserve est réalimentée en
  arrière-plan avec un budget de **30 s** (`meta.generation`, `{ mode: 'worker', budgetFondMs: 30_000 }`) :
  0,7 s en moyenne sur PC, soit 2 à 8 s sur tablette.
- **Diabolique** : servi **uniquement** par son pack de 200 grilles (`{ mode: 'pack' }`) : jamais de
  génération sur l'appareil, ni de fond ni urgente.
- Packs (`src/games/chiffres-cases/packs/`) : `expert.json` et `diabolique.json`, **200 grilles chacun**
  (graines 1, 2, 3… ; une graine qui redonne une grille déjà dans le pack est sautée :
  en Diabolique, la graine 122 redonne la grille de la graine 43, la suite du générateur aléatoire d'une
  graine pouvant rejoindre celle d'une graine voisine après des millions de tirages), générés par `npm run packs -- --jeu=chiffres-cases` en ~4 min et
  ~38 min sur PC. Taille : ~72 Ko chacun (~370 octets par grille), **~18 Ko** une fois compressés (gzip).

#### Nombre au départ (réglage, après l'étape 4b)

Réglage « Toujours placer un nombre au départ » (désactivé par défaut) : une **nouvelle** grille sans
aucun pré-placé en reçoit un (`depart.ts`, appelé dans le worker par `LogiqueJeu.preparer`). La notation
de la partie (niveau et force affichés, statistiques) reste celle de la grille d'origine.

Choix du nombre :
1. **Ouverture** de chaque emplacement essayé comme pré-placé : emplacements remplis par les seules
   techniques Débutant et Facile (ce que le joueur pose d'emblée). Classement par ouverture, puis longueur,
   puis numéro d'emplacement.
2. Premier candidat qui **garde le niveau** avec une ouverture d'au moins 3 (`OUVERTURE_MIN`) ; sinon le
   premier qui ouvre et ne baisse le niveau que d'un cran ; sinon le premier qui garde le niveau ; sinon
   celui qui le baisse le moins.

Mesures (packs, grilles sans pré-placé, PC) — ouverture moyenne sur 46 emplacements :

| Pack | Grilles | Sans aide | Nombre le plus long | Nombre choisi | Niveau gardé | Temps moyen / max |
|---|---|---|---|---|---|---|
| Expert | 196 | 0,2 | 12,7 | 9,4 | 120 (Difficile 54, Moyen 22) | 30 / 138 ms |
| Diabolique | 170 | 0,8 | 18,7 | 30,0 | 169 (Expert 1) | 13 / 161 ms |

Écartés : le nombre qui « facilite le plus » la grille (notation la plus basse) ramène presque tous les
Expert et Diabolique au niveau Moyen ou Débutant, en jusqu'à 3 s ; les règles simples (nombre le plus long,
longueur rare, plus de croisements) n'aident pas en Diabolique (niveau et force inchangés, ouverture
moindre). En Expert, garder le niveau oblige souvent à un nombre qui ouvre peu : pour 76 grilles, aucun
nombre ne garde le niveau Expert en ouvrant la grille.

### Tectonic (étape 7a)

Grille découpée en zones de 1 à 5 cases ; une zone de N cases contient les chiffres 1 à N ; deux cases qui
se touchent (côté ou diagonale) n'ont jamais le même chiffre. Solution unique garantie (backtracking du
moteur). Code : `src/games/tectonic/` ; le jeu **réutilise le moteur et le solveur logique** du sudoku
(zones = régions complètes, carrés 2×2 = cases qui se touchent, domaine 1 à N par case) avec sa propre
liste de techniques (`techniques.ts`) et sa notation (`notation.ts`, `VERSION_NOTATION_TECTONIC` = 1).
Comme au sudoku, une grille qui exige de l'essai-erreur est **rejetée** ; `forcing-simple` n'utilise
jamais le raisonnement par contradiction.

#### Techniques

Dans les explications, une case hors d'une zone « touche » ses voisines ; les techniques reprises du
sudoku disent « voit » (= se touchent ou sont dans la même zone : définition donnée dans la fiche du jeu,
étape 7b).

| Niveau | Identifiant | Ce que fait la technique |
|---|---|---|
| Débutant | `dernier-chiffre` | La dernière case vide d'une zone reçoit le chiffre manquant (zones d'une case comprises) |
| Débutant | `singleton-cache-zone` | Dans une zone, un chiffre n'a plus qu'une place (les voisines ont éliminé les autres) |
| Facile | `singleton-nu` | Une case n'a plus qu'un chiffre possible |
| Facile | `voisine-commune` | Dans une zone, un chiffre n'a plus que 2 places ; une case qui touche les deux ne peut pas le contenir |
| Moyen | `paire-nue`, `paire-cachee` | Dans une zone ou un carré 2×2 (cachée : zones seulement) |
| Moyen | `voisine-commune-etendue` | Comme la voisine commune, avec 3 places ou plus à vérifier |
| Moyen | `paire-nue-etendue` | Deux cases qui se voient, mêmes 2 candidats : retirés de toute case qui voit les deux |
| Difficile | `triplet-nu`, `triplet-cache`, `quadruplet-nu`, `quadruplet-cache` | Comme au sudoku (zones et carrés) |
| Expert | `y-wing`, `xyz-wing` | Comme au sudoku (relation « se voient ») |
| Diabolique | `x-chain`, `xy-chain`, `forcing-simple` | Comme au sudoku |

Absentes : pointing et claiming (englobés par la voisine commune), Skyscraper, 2-String Kite, X-Wing,
Swordfish (fondés sur les lignes et les colonnes). Triplet caché et quadruplets ne sont jamais
indispensables (comme au sudoku) : testés sur des états préparés.

#### Construction des grilles

Découper au hasard puis remplir échoue presque toujours : deux 1 ne se touchent jamais, donc une grille
9 × 9 a au plus 25 chiffres 1, soit au plus 25 zones ; mesuré, moins de 1 % des découpages 9 × 9 se
remplissent. `construction.ts` construit **les zones et les chiffres ensemble** : cases remplies dans
l'ordre de lecture avec retour en arrière (5000 nœuds par tentative), chaque case choisit sa zone (gauche,
haut, les deux réunies, nouvelle zone avec une taille visée tirée au hasard) et son chiffre (le plus petit
chiffre qui manque à la zone est proposé d'abord 8 fois sur 10 : coût divisé par deux environ) ; une zone
qui ne peut plus grandir doit contenir exactement 1 à N. Au plus 1 zone d'une case (6 × 6, 7 × 7), 2
au-delà. Coût d'une grille pleine sur PC : ~25 ms en 8 × 8, ~75 ms en 9 × 9, 200 à 500 ms en 10 × 10.
Conséquence de la règle : environ 70 % des zones ont 5 cases, 12 à 15 % 4 cases, 4 à 9 % chacune des
tailles 1 à 3.

Puis, comme au sudoku : retrait des chiffres (`retirerChiffres`, sans symétrie) avec la fonction
d'acceptation (refus si le niveau est dépassé), arrêt tôt en Débutant et Facile (**12 à 15 chiffres
donnés**), contrôle final du niveau exact.

#### Réglages et mesures (validés par l'utilisateur)

Zones de 5 cases au plus à tous les niveaux. Mesures `npm run bench -- --jeu=tectonic` (PC, graines 1 à
100 ; 30 grilles en Expert et Diabolique ; au plus 1000 essais ; **aucun échec**) :

| Niveau | Grille | Essais moy / max | Temps moy / méd / max | Chiffres donnés moy (min-max) | Technique du niveau (part des grilles) |
|---|---|---|---|---|---|
| Débutant | 6 × 6 | 1,0 / 1 | 6 / 3 / 29 ms | 13,4 (12-15), 37 % | dernier chiffre, seule place dans la zone |
| Facile | 7 × 7 | 1,3 / 3 | 16 / 13 / 80 ms | 13,4 (12-15), 27 % | singleton nu 91 %, voisine commune 87 % |
| Moyen | 8 × 8 | 2,4 / 14 | 0,12 / 0,08 / 0,66 s | 9,8 (5-16), 15 % | paire nue 76 %, voisine commune étendue 69 % |
| Difficile | 8 × 8 | 15 / 88 | 0,76 / 0,59 / 4,7 s | 9,4 (6-13), 15 % | triplet nu 100 % |
| Expert | 9 × 9 | 15 / 64 | 2,1 / 1,6 / 8,1 s | 11,4 (8-16), 14 % | Y-Wing 83 %, XYZ-Wing 33 % |
| Diabolique | 10 × 10 | 4,2 / 18 | 2,2 / 1,9 / 8,4 s | 12,6 (8-17), 13 % | chaîne X 80 %, forcing 53 %, chaîne XY 23 % |

Grilles minimales au hasard : Difficile et Expert rares (1 à 5 %), Diabolique 6 à 18 %, essai-erreur
5 à 6 % (6 × 6, 7 × 7), 21 % (8 × 8, 9 × 9), 33 % (10 × 10).

Variantes écartées : **zones de 6 cases** en Expert et Diabolique (deux fois plus de chiffres donnés, 28 %
des cases au lieu de 14 % ; génération 2 à 3 fois plus longue ; pas de techniques plus riches) ;
Diabolique en 9 × 9 (0,7 s en moyenne, moins de chaînes : choisi 10 × 10).

#### Force (1 à 10)

Même règle que le sudoku (`SEUILS_FORCE_TECTONIC`, score et chiffres donnés) ; Expert = 9, Diabolique = 10.

| Niveau | Force basse / haute | Force haute si | Part en force haute (100 grilles) |
|---|---|---|---|
| Débutant | 1 / 2 | ≤ 13 chiffres donnés (le score compte les cases vides) | 56 % |
| Facile | 3 / 4 | score ≥ 6 ou ≤ 12 chiffres donnés | 53 % |
| Moyen | 5 / 6 | score ≥ 4 ou ≤ 6 chiffres donnés | 52 % |
| Difficile | 7 / 8 | score ≥ 5 ou ≤ 7 chiffres donnés | 50 % |

#### Utilisation dans l'appli et packs

- Débutant à Moyen : générés dans le worker (budget de 4 s ; Moyen au pire 0,66 s sur PC).
- **Difficile** (au pire 4,7 s sur PC, jusqu'à ~25 s sur tablette) : pack de 200 grilles servi quand la
  réserve est vide, réalimentation de fond avec **30 s** (`meta.generation`).
- **Expert** et **Diabolique** (~2 s en moyenne sur PC, ~10 s sur tablette) : packs de 200 grilles,
  réalimentation de fond avec **60 s**.
- Packs (`src/games/tectonic/packs/`, format `PackTectonic` : zones en base 36, solution et énoncé en
  texte, lignes séparées par « / ») : `npm run packs -- --jeu=tectonic` (graines 1, 2, 3…, aucune sautée),
  ~3 min (Difficile), ~7 min (Expert), ~5 min (Diabolique) sur PC. Taille : 95, 106 et 124 Ko (490 à
  630 octets par grille), **19, 24 et 29 Ko** compressés (gzip). **Si `VERSION_NOTATION_TECTONIC` change,
  les régénérer.**
