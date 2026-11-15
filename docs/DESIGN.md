# Design — les styles de l'appli

Sac2Riz propose **six styles**, chacun en clair et en sombre. Le joueur choisit dans
**Réglages → Application → « Style »**, juste au-dessus du thème (Automatique / Clair / Sombre), avec
lequel le style se combine. **Rétro** est le style par défaut. Le choix est un réglage comme les autres :
enregistré dans IndexedDB et inclus dans l'export.

Un style ne touche qu'à la couche visuelle : variables de thème, polices, icônes, décors. La logique, la
navigation et le contrat des jeux n'en dépendent jamais.

Historique : l'étape 6b a proposé sept directions à l'essai. À l'étape 6c, l'utilisateur en a gardé
plusieurs, au choix de façon permanente, et en a retiré deux (Années 80-90 et Terminal).

## Les styles

| Style | Clair | Sombre | Polices | Décors |
|---|---|---|---|---|
| **Ardoise** | gris bleutés, accent bleu encre | ardoise foncée | police du système (Roboto sur Android) | aucun |
| **ASCII** | feuille de machine à écrire | fichier texte .NFO | Courier Prime | cadres `+- - -+`, titre en art ASCII, frise ` .:-=+*#%@` |
| **ASCII génératif** | blanc cassé, indigo, magenta | nuit, violet, rose, cyan | Space Mono | champ de caractères **animé** (en-têtes), motif figé propre à chaque jeu au fond des cartes |
| **BBS ANSI** | ANSI imprimé dans un fanzine | noir, couleurs CGA vives | Px437 IBM BIOS (titres), Px437 IBM EGA 8x14 ; notes : Fira Mono | bandes `░▒▓█`, logo en couches de blocs, cadres de couleur par carte |
| **MS-DOS** | écran LCD de portable (une seule encre, inversion vidéo) | fond bleu VGA, traits cyan, saisies jaunes | Px437 IBM VGA 8x16 ; notes : IBM Plex Mono | panneaux à double trait, barres de titre inversées, ombres pleines, trame |
| **Rétro** (60-70, par défaut) | papier crème, orange brûlé, moutarde, olive | brun teck, texte crème | Fraunces (titres), Karla | arc-en-ciel 70s et soleil rayonnant, grain de papier, bande tricolore des cartes |

**ASCII et MS-DOS** : ASCII est une *page de texte tapée* (aucune couleur, cadres en caractères) ;
MS-DOS est une *application à fenêtres* (palette VGA, double trait, ombre pleine).

**Icônes** : 11 icônes SVG par style (`public/design/<style>/icones/`), dessinées dans l'esprit du style :
trait arrondi (Ardoise), assemblages de caractères (ASCII), traits fins et points (ASCII génératif),
pixel art 12 × 12 (BBS ANSI) et 16 × 16 (MS-DOS), formes pleines et rondes (Rétro).

## Le réglage « Style »

- Une option par style. Chaque option montre une **pastille d'aperçu** dessinée par le style lui-même :
  son fond et son cadre, « Aa » dans sa police de titre, un chiffre saisi, ses quatre couleurs (accent et
  décors). La pastille suit le thème clair / sombre de la page. Le nom du style est écrit dessous.
- Le style s'applique tout de suite, sans redémarrer.
- Ordre des options : alphabétique (`STYLES`, `src/types/style.ts`).

## Règles communes

- **Lisibilité** : les chiffres de la grille sont dans une police nette. Quand la police d'ambiance est
  bitmap (MS-DOS, BBS ANSI), les notes du sudoku et la liste des chiffres casés utilisent une police
  secondaire lisible. Les facteurs `--echelle-chiffres` / `--echelle-notes` compensent les polices qui
  paraissent petites.
- **Contrastes** vérifiés par un test (`tests/socle/style/styles.test.ts`, formule WCAG) dans les
  12 variantes :
  - texte, chiffres donnés et saisis, notes, erreurs et indices ≥ 4,5:1, sur la case et sur chaque mise
    en évidence ;
  - traits de bloc et notes en accent ≥ 3:1 ;
  - bordures de zone du Tectonic (étape 7b, seuils validés par l'utilisateur) : trait épais ≥ 3:1 sur le
    trait fin, sur la zone mise en évidence et sur la case sélectionnée ; trait épais au moins deux fois plus
    large que le trait fin. BBS ANSI sombre a reçu un trait épais plus clair (`#7777ff` au lieu de
    `#5555ff`, mesuré à 2,62:1 sur le trait fin).
- **Pavé commun** : une touche épuisée est estompée ; une touche impossible dans la case sélectionnée
  (étape 7b) est désactivée, sans fond, avec un cadre pointillé `--couleur-bordure`, dans tous les styles
  (y compris MS-DOS, dont les touches n'ont d'ordinaire pas de cadre).
- **Effets** : seulement sur l'accueil et la fiche d'un jeu, **jamais pendant une partie** ; coupés si
  le système demande de réduire les animations. ASCII génératif : ~8 images/s, arrêt quand l'appli est en
  arrière-plan, image fixe si les animations sont réduites.

## Fonctionnement technique

- **Attribut** : `<html data-style="<id>">`, toujours présent (Ardoise compris).
- **Feuilles** : une par style, sauf Ardoise (`src/styles/visuels/<id>.css`, toutes chargées par
  `index.html`). Leurs règles sont sous `:root[data-style="<id>"]`.
- **Variables d'un style** : son bloc de variables vise aussi `.apercu-style[data-style="<id>"]`, la
  pastille du réglage. Dans `theme.css`, le bloc d'Ardoise vise `:root` et `.apercu-style`. Ainsi, chaque
  pastille repart des valeurs d'Ardoise, puis prend celles de son style, au lieu d'hériter du style
  affiché. Le test des contrastes lit exactement ces blocs.
- **Clair / sombre** : chaque couleur s'écrit `light-dark(<clair>, <sombre>)`. `theme.css` ne fixe que
  `color-scheme` : celui du système, ou celui forcé par `data-theme`. Il n'y a qu'une écriture par style.
- **Variables** (`src/styles/theme.css`, valeurs d'Ardoise, qui servent de secours aux autres styles) :
  - couleurs, `--couleur-decor-1/2/3`, `--couleur-halo` ;
  - polices (`--police`, `--police-titre`, `--police-chiffres`, `--police-notes`), graisses, échelles ;
  - formes de la grille (`--grille-rayon`, `--grille-cadre`, `--grille-trait-bloc`, `--grille-trait-case`,
    `--grille-trait-zone` = trait de bloc + 1 px, pour les bordures de zone du Tectonic) et des cartes
    (`--carte-bordure`, `--carte-ombre`).

  Les `style.css` des jeux n'utilisent que ces variables : **aucune règle de style ne vise une classe de
  jeu**.
- **Icônes** : le code pose un nom (`icone('reglages')`, `src/socle/dom.ts`, noms dans
  `src/socle/icones.ts`). Le CSS associe le dessin (`mask-image`, couleur = celle du texte).
- **Décor génératif** : `src/socle/style/decors.ts`, canvas dans les zones `.decor` de l'accueil et de
  la fiche, et au fond des cartes. Il suit les changements de style (`suivreStyle`).

### Enregistrement et démarrage sans clignotement

- **Référence** : le style est enregistré dans les réglages (`Reglages.style`, IndexedDB), avec le
  reste, et il est donc exporté (format n° 3). Des réglages ou un fichier d'avant l'étape 6c (sans style)
  reçoivent Rétro, de même qu'un style inconnu (`normaliserReglages`).
- **Copie locale** : IndexedDB se lit après le premier affichage. Pour que la page s'affiche directement
  dans le bon style, une copie `{ style, theme }` est gardée dans le stockage local du navigateur (clé
  `sac2riz-affichage`, `src/socle/style/affichage.ts`). Elle est réécrite à chaque démarrage et à chaque
  changement (`appliquerAffichage`, `src/socle/style/appliquer.ts`).
- **`public/demarrage.js`** : petit script **classique et bloquant**, chargé dans `<head>` avant le code de
  l'appli. Il lit la copie et pose `data-style` et `data-theme` avant le premier rendu. Sans copie, il
  garde Rétro, déjà écrit dans `index.html`.
  - Il est en JavaScript et non en TypeScript : `tsc` produirait un module ES, qui s'exécuterait trop tard.
  - La page interdit les scripts écrits directement dans le HTML (CSP), d'où un fichier à part.
  - Son comportement est testé dans un bac à sable (`tests/socle/style/demarrage.test.ts`), y compris
    l'égalité de sa liste de styles avec `STYLES`.
- **Reprise de l'essai (une seule fois)** : l'étape 6b gardait le choix d'essai dans la clé locale
  `sac2riz-direction-essai`.
  - Au premier démarrage qui la trouve, `main.ts` l'enregistre dans les réglages, puis supprime la clé.
    La suppression n'a lieu qu'après une écriture réussie.
  - Années 80-90 et Terminal deviennent Rétro.
  - `demarrage.js` lit aussi cette clé quand il n'y a pas encore de copie : même ce démarrage-là ne
    clignote pas.

### Ajouter un style

1. Créer `src/styles/visuels/<id>.css`. Son bloc de variables vise `:root[data-style="<id>"]` et
   `.apercu-style[data-style="<id>"]` (sélecteurs sur deux lignes, comme dans les autres feuilles : le
   test les lit ainsi) ; le reste vise `:root[data-style="<id>"]`.
2. Ajouter les 11 icônes dans `public/design/<id>/icones/` et les relier dans la feuille.
3. Ajouter les polices dans `public/polices/` et leur licence dans `public/polices/licences/`.
4. Ajouter l'id dans `STYLES` et son nom dans `NOMS_STYLES` (`src/types/style.ts`), **et** dans la liste
   de `public/demarrage.js`.
5. Ajouter le `<link>` dans `public/index.html`.

Les tests vérifient chaque étape : contrastes, icônes, polices et licences, listes identiques, aucune
feuille ni police orpheline.

## Icône de l'appli

Elle est dans le style Rétro (le style par défaut) : fond crème, arc-en-ciel à trois bandes (orange brûlé,
moutarde, olive) qui se lève derrière une grille 3 × 3 brune à traits épais, dont la case centrale est
orange (une case choisie).
- **Lisibilité** : elle a été vérifiée en 48 et 72 px, la taille réelle sur l'écran d'accueil d'Android,
  et dans la forme ronde. Le chiffre d'un premier essai a été retiré : il devenait une tache à ces tailles.
- **Maskable** : le motif est réduit pour tenir dans la zone sûre (cercle de rayon 40 %, vérifié par un
  test).
- **Couleurs du manifest** (fond de l'écran de démarrage, couleur de thème) et des balises `theme-color` :
  le fond de Rétro (`#f3e9d2` en clair, `#2a1d14` en sombre pour la balise).
- **Génération** : `npm run icones` (`scripts/icones/dessin.ts`).

## Polices et licences

Toutes intégrées dans `public/polices/` : copiées dans `dist/`, donc mises en cache par le service
worker. **Aucun appel externe.** Le texte complet des licences est dans `public/polices/licences/`.

| Police | Fichiers | Licence | Auteurs | Style |
|---|---|---|---|---|
| Courier Prime | `courier-prime-400/700.woff2` | SIL OFL 1.1 | The Courier Prime Project Authors (Quote-Unquote Apps) | ASCII |
| Space Mono | `space-mono-400/700.woff2` | SIL OFL 1.1 | The Space Mono Project Authors (Colophon) | ASCII génératif |
| Fira Mono | `fira-mono-500.woff2` | SIL OFL 1.1 | Mozilla Foundation, Telefonica S.A. | BBS ANSI |
| IBM Plex Mono | `ibm-plex-mono-600.woff2` | SIL OFL 1.1 | IBM Corp. | MS-DOS |
| Fraunces | `fraunces-700.woff2` | SIL OFL 1.1 | The Fraunces Project Authors (Undercase Type) | Rétro |
| Karla | `karla-400/600/700.woff2` | SIL OFL 1.1 | The Karla Project Authors | Rétro |
| Px437 IBM VGA 8x16, IBM EGA 8x14, IBM BIOS | `px437-*.woff` | **CC BY-SA 4.0** | VileR, « The Ultimate Oldschool PC Font Pack » (int10h.org) | MS-DOS, BBS ANSI |

- **Polices SIL OFL** : sous-ensemble latin des paquets Fontsource.
- **Polices Px437** : version web (« Web437 ») de l'archive v2.2. La licence CC BY-SA 4.0 impose de
  **citer l'auteur** (ci-dessus) et de partager toute modification de la police sous la même licence ;
  les fichiers sont utilisés tels quels.
- **Vérification** : un test garantit que chaque police sert à au moins un style et que chaque licence
  correspond à une police présente.
