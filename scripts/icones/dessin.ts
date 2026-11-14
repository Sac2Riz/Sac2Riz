// DESSIN DE L'ICÔNE (provisoire), décrit par des formes simples dans un carré de 512 × 512 :
// fond bleu, grille 3 × 3 claire, un « 2 » façon afficheur à segments dans la case centrale.
// La même description produit l'icône SVG et les PNG (rendus ici, sans dépendance) : les
// fichiers restent toujours cohérents. Pour changer le design : modifier ce fichier, puis
// « npm run icones ».

/** Rectangle à coins arrondis (r = rayon des coins), dans le repère 512 × 512. */
export type Forme = {
  readonly x: number;
  readonly y: number;
  readonly l: number;
  readonly h: number;
  readonly r: number;
  readonly couleur: string;
};

export const TAILLE_REPERE = 512;
const FOND = '#2f5d8a';
const TRAIT = '#f6f4ef';

/** Grille 3 × 3 (traits pleins) et chiffre « 2 » (5 segments), sans le fond. */
function motif(): Forme[] {
  const formes: Forme[] = [];
  const debut = 96;
  const fin = 416;
  const e = 14;
  for (const position of [debut, 203, 309, fin]) {
    formes.push({ x: position - e / 2, y: debut - e / 2, l: e, h: fin - debut + e, r: 0, couleur: TRAIT });
    formes.push({ x: debut - e / 2, y: position - e / 2, l: fin - debut + e, h: e, r: 0, couleur: TRAIT });
  }
  // « 2 » à segments : haut, haut droite, milieu, bas gauche, bas
  const g = 228;
  const d = 284;
  const haut = 216;
  const milieu = 256;
  const bas = 296;
  const s = 14;
  const segment = (x: number, y: number, l: number, h: number): Forme => ({ x, y, l, h, r: s / 2, couleur: TRAIT });
  formes.push(
    segment(g - s / 2, haut - s / 2, d - g + s, s),
    segment(d - s / 2, haut - s / 2, s, milieu - haut + s),
    segment(g - s / 2, milieu - s / 2, d - g + s, s),
    segment(g - s / 2, milieu - s / 2, s, bas - milieu + s),
    segment(g - s / 2, bas - s / 2, d - g + s, s),
  );
  return formes;
}

/** Réduit une forme autour du centre (version « maskable »). */
function reduire(forme: Forme, facteur: number): Forme {
  const c = TAILLE_REPERE / 2;
  return {
    x: c + (forme.x - c) * facteur,
    y: c + (forme.y - c) * facteur,
    l: forme.l * facteur,
    h: forme.h * facteur,
    r: forme.r * facteur,
    couleur: forme.couleur,
  };
}

/**
 * Formes de l'icône, dans l'ordre de dessin.
 * « maskable » : Android découpe l'icône (rond, goutte…) ; le fond couvre tout le carré et le
 * motif tient dans la zone sûre (cercle central de rayon 40 %) : réduit à 85 %, ses coins sont à ~38 %.
 */
export function formesIcone(maskable: boolean): readonly Forme[] {
  const fond: Forme = { x: 0, y: 0, l: TAILLE_REPERE, h: TAILLE_REPERE, r: maskable ? 0 : 96, couleur: FOND };
  return [fond, ...motif().map((f) => (maskable ? reduire(f, 0.85) : f))];
}

/** Icône SVG (vectorielle : favicon et icône de taille libre). */
export function iconeSvg(): string {
  const lignes = formesIcone(false).map(
    (f) => `  <rect x="${f.x}" y="${f.y}" width="${f.l}" height="${f.h}"${f.r > 0 ? ` rx="${f.r}"` : ''} fill="${f.couleur}"/>`,
  );
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TAILLE_REPERE} ${TAILLE_REPERE}">`,
    '  <!-- Icône provisoire, générée par « npm run icones » (scripts/icones/dessin.ts) : ne pas modifier à la main. -->',
    ...lignes,
    '</svg>',
    '',
  ].join('\n');
}

function couleurEnRvb(couleur: string): readonly [number, number, number] {
  const n = Number.parseInt(couleur.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Vrai si le point (px, py) est dans la forme (rectangle à coins arrondis). */
export function contient(f: Forme, px: number, py: number): boolean {
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
