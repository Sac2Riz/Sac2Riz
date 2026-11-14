// DESSIN DE L'ICÔNE, style « Rétro » (le style par défaut de l'appli), décrit par des formes simples
// dans un carré de 512 × 512 : fond crème, arc-en-ciel des années 70 (orange brûlé, moutarde, olive)
// qui se lève derrière une grille brune dont la case centrale est choisie (orange).
// Couleurs : celles du style Rétro (src/styles/visuels/retro.css).
// La même description produit l'icône SVG et les PNG (rendus ici, sans dépendance) : les
// fichiers restent toujours cohérents. Pour changer le design : modifier ce fichier, puis
// « npm run icones ».

/** Rectangle à coins arrondis (r = rayon des coins), dans le repère 512 × 512. */
export type Rectangle = {
  readonly x: number;
  readonly y: number;
  readonly l: number;
  readonly h: number;
  readonly r: number;
  readonly couleur: string;
};

/** Moitié haute d'un anneau (bande d'arc-en-ciel) de centre (cx, cy), entre les rayons rInt et rExt. */
export type DemiAnneau = {
  readonly cx: number;
  readonly cy: number;
  readonly rInt: number;
  readonly rExt: number;
  readonly couleur: string;
};

export type Forme = Rectangle | DemiAnneau;

export const TAILLE_REPERE = 512;

const CREME = '#f3e9d2';
const CASE = '#fffaf0';
const BRUN = '#5a3d22';
const ORANGE = '#c4511b';
const MOUTARDE = '#e0a526';
const OLIVE = '#7a8b3a';

/** Arc-en-ciel et grille, sans le fond. */
function motif(): Forme[] {
  const formes: Forme[] = [];
  // Arc-en-ciel : trois bandes, de l'extérieur vers l'intérieur
  const cx = 256;
  const cy = 300;
  const bande = 50;
  const rExt = 240;
  [ORANGE, MOUTARDE, OLIVE].forEach((couleur, i) => {
    formes.push({ cx, cy, rInt: rExt - (i + 1) * bande, rExt: rExt - i * bande, couleur });
  });
  // Grille 3 × 3 : un carreau brun (cadre et traits épais, lisibles en 48 px), cases claires, case
  // centrale orange (une case choisie). Pas de chiffre : illisible à la taille de l'écran d'accueil.
  const cote = 250;
  const x0 = cx - cote / 2;
  const y0 = 210;
  const cadre = 24;
  const trait = 16;
  formes.push({ x: x0, y: y0, l: cote, h: cote, r: 28, couleur: BRUN });
  const caseL = (cote - 2 * cadre - 2 * trait) / 3;
  for (let ligne = 0; ligne < 3; ligne++) {
    for (let col = 0; col < 3; col++) {
      const centre = col === 1 && ligne === 1;
      formes.push({
        x: x0 + cadre + col * (caseL + trait),
        y: y0 + cadre + ligne * (caseL + trait),
        l: caseL,
        h: caseL,
        r: 6,
        couleur: centre ? ORANGE : CASE,
      });
    }
  }
  return formes;
}

/** Réduit une forme autour du centre (version « maskable »). */
function reduire(forme: Forme, facteur: number): Forme {
  const c = TAILLE_REPERE / 2;
  const p = (v: number): number => c + (v - c) * facteur;
  if ('cx' in forme) {
    return { cx: p(forme.cx), cy: p(forme.cy), rInt: forme.rInt * facteur, rExt: forme.rExt * facteur, couleur: forme.couleur };
  }
  return { x: p(forme.x), y: p(forme.y), l: forme.l * facteur, h: forme.h * facteur, r: forme.r * facteur, couleur: forme.couleur };
}

/** Réduction du motif dans la version « maskable » (il tient dans la zone sûre : cercle de rayon 40 %). */
export const REDUCTION_MASKABLE = 0.82;

/**
 * Formes de l'icône, dans l'ordre de dessin.
 * « maskable » : Android découpe l'icône (rond, goutte…) ; le fond couvre tout le carré et le
 * motif, réduit, tient dans la zone sûre (cercle central de rayon 40 % : vérifié par un test).
 */
export function formesIcone(maskable: boolean): readonly Forme[] {
  const fond: Rectangle = { x: 0, y: 0, l: TAILLE_REPERE, h: TAILLE_REPERE, r: maskable ? 0 : 96, couleur: CREME };
  return [fond, ...motif().map((f) => (maskable ? reduire(f, REDUCTION_MASKABLE) : f))];
}

function formeSvg(f: Forme): string {
  if ('cx' in f) {
    const { cx, cy, rInt, rExt } = f;
    return (
      `  <path d="M${cx - rExt} ${cy}A${rExt} ${rExt} 0 0 1 ${cx + rExt} ${cy}H${cx + rInt}` +
      `A${rInt} ${rInt} 0 0 0 ${cx - rInt} ${cy}Z" fill="${f.couleur}"/>`
    );
  }
  return `  <rect x="${f.x}" y="${f.y}" width="${f.l}" height="${f.h}"${f.r > 0 ? ` rx="${f.r}"` : ''} fill="${f.couleur}"/>`;
}

/** Icône SVG (vectorielle : favicon et icône de taille libre). */
export function iconeSvg(): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TAILLE_REPERE} ${TAILLE_REPERE}">`,
    '  <!-- Icône générée par « npm run icones » (scripts/icones/dessin.ts) : ne pas modifier à la main. -->',
    ...formesIcone(false).map(formeSvg),
    '</svg>',
    '',
  ].join('\n');
}

function couleurEnRvb(couleur: string): readonly [number, number, number] {
  const n = Number.parseInt(couleur.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Vrai si le point (px, py) est dans la forme. */
export function contient(f: Forme, px: number, py: number): boolean {
  if ('cx' in f) {
    if (py > f.cy) return false;
    const d2 = (px - f.cx) ** 2 + (py - f.cy) ** 2;
    return d2 >= f.rInt * f.rInt && d2 <= f.rExt * f.rExt;
  }
  const demiL = f.l / 2;
  const demiH = f.h / 2;
  const ecartX = Math.abs(px - (f.x + demiL));
  const ecartY = Math.abs(py - (f.y + demiH));
  if (ecartX > demiL || ecartY > demiH) return false;
  // Distance au « rectangle intérieur » des centres des coins : dans un coin, elle doit rester ≤ r
  const dx = Math.max(ecartX - (demiL - f.r), 0);
  const dy = Math.max(ecartY - (demiH - f.r), 0);
  return dx * dx + dy * dy <= f.r * f.r;
}

/**
 * Rend les formes en pixels RGBA (taille × taille), bords lissés par sur-échantillonnage :
 * 4 × 4 points par pixel, la part de points couverts donne l'opacité de la forme sur ce pixel.
 */
export function rendre(formes: readonly Forme[], taille: number): Uint8Array {
  const pixels = new Uint8Array(taille * taille * 4);
  const echelle = TAILLE_REPERE / taille;
  const n = 4;
  const couleurs = formes.map((f) => couleurEnRvb(f.couleur));
  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      // Couleur prémultipliée par l'opacité, composée forme après forme (chacune « par-dessus »)
      let r = 0;
      let v = 0;
      let b = 0;
      let a = 0;
      formes.forEach((forme, i) => {
        let couverts = 0;
        for (let sy = 0; sy < n; sy++) {
          for (let sx = 0; sx < n; sx++) {
            if (contient(forme, (x + (sx + 0.5) / n) * echelle, (y + (sy + 0.5) / n) * echelle)) couverts++;
          }
        }
        if (couverts === 0) return;
        const alpha = couverts / (n * n);
        const [cr, cv, cb] = couleurs[i] ?? [0, 0, 0];
        r = cr * alpha + r * (1 - alpha);
        v = cv * alpha + v * (1 - alpha);
        b = cb * alpha + b * (1 - alpha);
        a = alpha + a * (1 - alpha);
      });
      const k = (y * taille + x) * 4;
      // Le PNG attend une couleur non prémultipliée
      pixels[k] = a > 0 ? Math.round(r / a) : 0;
      pixels[k + 1] = a > 0 ? Math.round(v / a) : 0;
      pixels[k + 2] = a > 0 ? Math.round(b / a) : 0;
      pixels[k + 3] = Math.round(a * 255);
    }
  }
  return pixels;
}
