// DÉCORS GÉNÉRATIFS (style « ASCII génératif » seulement). Deux décors faits de caractères dessinés dans un <canvas> :
//   - champ ANIMÉ dans les zones .decor (en-tête de l'accueil, haut de la fiche d'un jeu) ;
//   - motif FIGÉ au fond de chaque carte de l'accueil (graine = nom du jeu : toujours le même).
// Sobriété : ~8 images par seconde, arrêt quand l'appli est en arrière-plan ou que le décor n'est plus
// affiché, une seule image fixe si le système demande de réduire les animations. Jamais pendant une
// partie (l'écran de partie n'a pas de zone .decor). Les autres styles n'y touchent pas.

import type { Style } from '../../types/style.ts';
import { styleCourant, suivreStyle } from './appliquer.ts';

const STYLE: Style = 'ascii-generatif';
/** Du plus clair au plus dense. */
const RAMPE = ' .·:-=+*#%@';
const TAILLE_CASE = 14; // px CSS
const IMAGES_PAR_SECONDE = 8;

type Couleurs = readonly [string, string, string];

/** Couleurs du décor, déjà résolues (clair ou sombre) : posées en CSS sur le canvas lui-même. */
function couleurs(canvas: HTMLCanvasElement): Couleurs {
  const s = getComputedStyle(canvas);
  return [s.color, s.borderTopColor, s.outlineColor];
}

/** Petit hachage d'un texte → graine (motif figé d'une carte). */
function graine(texte: string): number {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/** Densité 0..1 en (x, y) au temps t : somme d'ondes (aucun hasard : rendu stable). */
function densite(x: number, y: number, t: number, g: number): number {
  const a = Math.sin(x * 0.18 + t * 0.9 + g * 6.3);
  const b = Math.sin(y * 0.35 - t * 0.6 + x * 0.05);
  const c = Math.sin((x + y) * 0.11 + t * 0.4 + g * 2.1);
  const d = Math.sin(Math.hypot(x - 20 * g, y - 6) * 0.25 - t * 1.2);
  return (a + b + c + d + 4) / 8;
}

/** Dessine une image du champ ; `force` règle la densité (le motif d'une carte est plus discret). */
function dessiner(canvas: HTMLCanvasElement, t: number, g: number, force: number): void {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const l = Math.round(rect.width * ratio);
  const h = Math.round(rect.height * ratio);
  if (canvas.width !== l || canvas.height !== h) {
    canvas.width = l;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  const [c1, c2, c3] = couleurs(canvas);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const degrade = ctx.createLinearGradient(0, 0, rect.width, rect.height);
  degrade.addColorStop(0, c1);
  degrade.addColorStop(0.5, c2);
  degrade.addColorStop(1, c3);
  ctx.fillStyle = degrade;
  ctx.font = `${TAILLE_CASE - 2}px "Space Mono", monospace`;
  ctx.textBaseline = 'top';
  const colonnes = Math.ceil(rect.width / (TAILLE_CASE * 0.62));
  const lignes = Math.ceil(rect.height / TAILLE_CASE);
  for (let y = 0; y < lignes; y++) {
    for (let x = 0; x < colonnes; x++) {
      const v = Math.min(1, densite(x, y, t, g) * force);
      const i = Math.floor(v * (RAMPE.length - 1));
      const car = RAMPE[i];
      if (car !== undefined && car !== ' ') ctx.fillText(car, x * TAILLE_CASE * 0.62, y * TAILLE_CASE);
    }
  }
}

function nouveauCanvas(classe: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = classe;
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

export function demarrerDecors(racine: HTMLElement): void {
  const reduire = matchMedia('(prefers-reduced-motion: reduce)');
  /** Champs animés affichés, avec leur graine. */
  let champs: { canvas: HTMLCanvasElement; g: number }[] = [];
  let minuteur: number | null = null;
  const debut = performance.now();

  function arreter(): void {
    if (minuteur !== null) clearTimeout(minuteur);
    minuteur = null;
  }

  function image(): void {
    minuteur = null;
    champs = champs.filter((c) => c.canvas.isConnected);
    if (champs.length === 0 || document.hidden) return; // relancé par actualiser() ou visibilitychange
    const t = reduire.matches ? 0 : (performance.now() - debut) / 1000;
    for (const c of champs) dessiner(c.canvas, t, c.g, 1);
    if (!reduire.matches) minuteur = window.setTimeout(image, 1000 / IMAGES_PAR_SECONDE);
  }

  function actualiser(): void {
    const actif = styleCourant() === STYLE;
    arreter();
    if (!actif) {
      for (const c of racine.querySelectorAll('.decor-genere, .decor-carte')) c.remove();
      champs = [];
      return;
    }
    for (const zone of racine.querySelectorAll<HTMLElement>('.decor')) {
      if (zone.querySelector('.decor-genere') !== null) continue;
      const canvas = nouveauCanvas('decor-genere');
      zone.append(canvas);
      champs.push({ canvas, g: 0.37 });
    }
    for (const carte of racine.querySelectorAll<HTMLElement>('.carte-accueil')) {
      if (carte.querySelector('.decor-carte') !== null) continue;
      const canvas = nouveauCanvas('decor-carte');
      carte.prepend(canvas);
      // Motif figé : dessiné une fois, quand la carte a sa taille
      requestAnimationFrame(() => dessiner(canvas, 0, graine(carte.querySelector('.carte-jeu-nom')?.textContent ?? ''), 0.85));
    }
    image();
  }

  // Un changement d'écran remplace les enfants de la racine
  new MutationObserver(actualiser).observe(racine, { childList: true });
  suivreStyle(actualiser);
  reduire.addEventListener('change', actualiser);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && minuteur === null) image();
  });
  actualiser();
}
