# Design — directions à l'essai (étape 6b)

L'étape 6b propose **7 directions de design** (chacune en clair et en sombre) sur la vraie appli, pour en
choisir une. Le choix se fait dans **Réglages → Application → « Direction de design (essai) »** : il
s'applique tout de suite et se combine avec le thème Automatique / Clair / Sombre. **Ce sélecteur est
temporaire** : il sera retiré à l'étape 6c, quand une direction aura été retenue (voir ROADMAP.md).
« Ardoise » (le style d'origine) reste proposé comme référence.

Seule la couche visuelle change : variables de thème, polices, icônes, décors. Aucune modification de la
logique, de la navigation ni du contrat des jeux.

## Les directions

| Direction | Clair | Sombre | Polices | Décors |
|---|---|---|---|---|
| **Années 80-90** | « Memphis » : crème, fuchsia, turquoise, jaune, contours noirs, ombres dures | néon synthwave : nuit violette, rose et cyan néon | Bungee (titres), Rubik | confettis géométriques ; soleil rayé et grille en perspective (sombre) |
| **ASCII** | feuille de machine à écrire | fichier texte .NFO | Courier Prime | cadres `+- - -+`, titre en art ASCII, frise ` .:-=+*#%@` |
| **MS-DOS** | écran LCD de portable (une seule encre, inversion vidéo) | fond bleu VGA, traits cyan, saisies jaunes | Px437 IBM VGA 8x16 ; notes : IBM Plex Mono | panneaux à double trait, barres de titre inversées, ombres pleines, trame |
| **BBS ANSI** | ANSI imprimé dans un fanzine | noir, couleurs CGA vives | Px437 IBM BIOS (titres), Px437 IBM EGA 8x14 ; notes : Fira Mono | bandes `░▒▓█`, logo en couches de blocs, cadres de couleur par carte |
| **Rétro** (60-70) | papier crème, orange brûlé, moutarde, olive | brun teck, texte crème | Fraunces (titres), Karla | arc-en-ciel 70s et soleil rayonnant, grain de papier, bande tricolore des cartes |
| **ASCII génératif** | blanc cassé, indigo, magenta | nuit, violet, rose, cyan | Space Mono | champ de caractères **animé** (en-têtes), motif figé propre à chaque jeu au fond des cartes |
| **Terminal** | papier listing d'imprimante à aiguilles (bandes vertes, perforations) | phosphore vert, halo | VT323 ; notes : JetBrains Mono | invite `sac2riz:~$` et curseur, balayage et léger scintillement (sombre) |

**ASCII, MS-DOS et Terminal** : ASCII est une *page de texte tapée* (aucune couleur, cadres en
caractères) ; MS-DOS une *application à fenêtres* (palette VGA, double trait, ombre pleine) ; Terminal un
*flux à l'invite* (une seule teinte lumineuse, pas de cadre, halo et curseur).

**Icônes** : 11 icônes SVG par direction (`public/design/<direction>/icones/`), dans le style de la
direction : trait arrondi (Ardoise), trait épais avec ombre décalée (Années 80-90), assemblages de
caractères (ASCII), pixel art 16 × 16 (MS-DOS) et 12 × 12 (BBS ANSI), formes pleines et rondes (Rétro),
traits fins et points (ASCII génératif), traits anguleux (Terminal).

## Règles communes

- **Lisibilité** : chiffres de la grille dans une police nette ; notes du sudoku et liste des chiffres
  casés dans une police secondaire lisible quand la police d'ambiance est bitmap (MS-DOS, BBS ANSI,
  Terminal). Facteurs `--echelle-chiffres` / `--echelle-notes` pour les polices qui paraissent petites.
- **Contrastes** vérifiés par un test (`tests/socle/design/directions.test.ts`, formule WCAG) dans les
  16 variantes : texte, chiffres donnés et saisis, notes, erreurs, indices ≥ 4,5:1 sur la case et sur
  chaque mise en évidence ; traits de bloc et notes en accent ≥ 3:1.
- **Effets** : seulement sur l'accueil et la fiche d'un jeu, **jamais pendant une partie** ; coupés si le
  système demande de réduire les animations. ASCII génératif : ~8 images/s, arrêt quand l'appli est en
  arrière-plan, image fixe si animations réduites. Terminal : balayage et scintillement en sombre
  seulement (aucun en clair).

## Fonctionnement technique

- `<html data-direction="<id>">` (absent = Ardoise) ; une feuille par direction
  (`src/styles/directions/<id>.css`, toutes chargées par `index.html`, règles sous
  `:root[data-direction="<id>"]`).
- **Clair / sombre** : chaque couleur s'écrit `light-dark(<clair>, <sombre>)` ; `theme.css` ne fixe que
  `color-scheme` (système, ou `data-theme` forcé). Une seule écriture par direction.
- **Variables** (`src/styles/theme.css`, valeurs Ardoise) : couleurs, `--couleur-decor-1/2/3`,
  `--couleur-halo`, polices (`--police`, `--police-titre`, `--police-chiffres`, `--police-notes`),
  graisses, échelles, formes de la grille (`--grille-rayon`, `--grille-cadre`, `--grille-trait-bloc`,
  `--grille-trait-case`) et des cartes (`--carte-bordure`, `--carte-ombre`). Les `style.css` des jeux
  n'utilisent que ces variables : **aucune règle de direction ne vise une classe de jeu**.
- **Icônes** : le code pose un nom (`icone('reglages')`, `src/socle/dom.ts`, noms dans
  `src/socle/icones.ts`) ; le CSS associe le dessin (`mask-image`, couleur = celle du texte).
- **Choix enregistré** dans le stockage local du navigateur (`sac2riz-direction-essai`,
  `src/socle/design/`) : volontairement hors des réglages IndexedDB (ni schéma, ni migration, ni export).
- **Décor génératif** : `src/socle/design/decors.ts` (canvas dans les zones `.decor` de l'accueil et de
  la fiche, et au fond des cartes).

### Retrait à l'étape 6c
Garder la direction retenue comme seule feuille (ses valeurs dans `theme.css`), ses icônes et ses polices ;
supprimer les autres feuilles, icônes et polices, `choixDirection` (`ecran-reglages.ts`),
`src/socle/design/directions.ts` et `appliquer.ts` (et `decors.ts` si la direction n'est pas l'ASCII
génératif), les tests associés, et le lien `<link>` des directions dans `index.html`.

## Polices et licences

Toutes intégrées dans `public/polices/` (copiées dans `dist/`, donc mises en cache par le service worker :
**aucun appel externe**). Texte complet des licences dans `public/polices/licences/`.

| Police | Fichiers | Licence | Auteurs |
|---|---|---|---|
| Bungee | `bungee-400.woff2` | SIL OFL 1.1 | The Bungee Project Authors (David Jonathan Ross) |
| Rubik | `rubik-400/500/700.woff2` | SIL OFL 1.1 | The Rubik Project Authors |
| Courier Prime | `courier-prime-400/700.woff2` | SIL OFL 1.1 | The Courier Prime Project Authors (Quote-Unquote Apps) |
| Fraunces | `fraunces-700.woff2` | SIL OFL 1.1 | The Fraunces Project Authors (Undercase Type) |
| Karla | `karla-400/600/700.woff2` | SIL OFL 1.1 | The Karla Project Authors |
| Space Mono | `space-mono-400/700.woff2` | SIL OFL 1.1 | The Space Mono Project Authors (Colophon) |
| VT323 | `vt323-400.woff2` | SIL OFL 1.1 | The VT323 Project Authors (Peter Hull) |
| IBM Plex Mono | `ibm-plex-mono-600.woff2` | SIL OFL 1.1 | IBM Corp. |
| Fira Mono | `fira-mono-500.woff2` | SIL OFL 1.1 | Mozilla Foundation, Telefonica S.A. |
| JetBrains Mono | `jetbrains-mono-600.woff2` | SIL OFL 1.1 | The JetBrains Mono Project Authors |
| Px437 IBM VGA 8x16, IBM EGA 8x14, IBM BIOS | `px437-*.woff` | **CC BY-SA 4.0** | VileR, « The Ultimate Oldschool PC Font Pack » (int10h.org) |

Polices SIL OFL : sous-ensemble latin des paquets Fontsource. Polices Px437 : version web (« Web437 »)
de l'archive v2.2 ; la licence CC BY-SA 4.0 impose de **citer l'auteur** (ci-dessus) et de partager
toute modification de la police sous la même licence (les fichiers sont utilisés tels quels).

## Captures de comparaison

Faites dans Edge sans fenêtre, tablette simulée 1280 × 800 en paysage : accueil, fiche du sudoku, partie
de sudoku avec des notes (case à notes sélectionnée), partie de chiffres casés, réglages — pour chaque
direction en clair et en sombre. Elles sont rangées dans `captures/6b/` (ignoré par Git), avec une
planche `captures/6b/index.html` pour comparer.
