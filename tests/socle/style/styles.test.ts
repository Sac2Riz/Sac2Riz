// Tests des styles de l'appli (réglage « Style ») : liste, variables complètes, contrastes suffisants
// en clair ET en sombre, icônes et polices présentes, aucun fichier orphelin des styles retirés.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { NOMS_ICONES } from '../../../src/socle/icones.ts';
import { NOMS_STYLES, STYLE_PAR_DEFAUT, STYLES, estStyle } from '../../../src/types/style.ts';
import { contraste, lireBloc, resoudre, rvb, type Mode, type Variables } from './lecture-css.ts';

const THEME = 'src/styles/theme.css';
const feuille = (id: string): string => (id === 'ardoise' ? THEME : `src/styles/visuels/${id}.css`);
const ARDOISE = lireBloc(THEME, ':root,\n.apercu-style');
const variablesDe = (id: string): Variables =>
  id === 'ardoise' ? ARDOISE : lireBloc(feuille(id), `:root[data-style="${id}"],\n.apercu-style[data-style="${id}"]`);

/** Couleurs que chaque style doit redéfinir (les autres peuvent garder celles d'Ardoise). */
const COULEURS = [
  'fond', 'surface', 'case', 'texte', 'texte-doux', 'saisie', 'accent', 'sur-accent', 'bordure', 'trait-fin',
  'trait-epais', 'zone', 'meme', 'selection', 'note', 'erreur', 'erreur-fond', 'indice', 'indice-fond', 'place',
  'decor-1', 'decor-2', 'decor-3',
].map((n) => `--couleur-${n}`);

/** [texte, fond, contraste minimal] : tout ce qui se lit (4,5:1), traits et notes surlignées (3:1). */
const PAIRES: readonly (readonly [string, string, number])[] = [
  ['texte', 'fond', 4.5], ['texte', 'surface', 4.5], ['texte-doux', 'fond', 4.5], ['texte-doux', 'surface', 4.5],
  ['accent', 'fond', 4.5], ['sur-accent', 'accent', 4.5],
  // Grille : chiffres donnés, saisis, notes, sur la case et sur chaque mise en évidence
  ['texte', 'case', 4.5], ['saisie', 'case', 4.5], ['note', 'case', 4.5],
  ['texte', 'zone', 4.5], ['saisie', 'zone', 4.5], ['note', 'zone', 4.5],
  ['texte', 'meme', 4.5], ['saisie', 'meme', 4.5],
  ['texte', 'selection', 4.5], ['saisie', 'selection', 4.5], ['note', 'selection', 4.5],
  ['erreur', 'case', 4.5], ['erreur', 'erreur-fond', 4.5], ['place', 'case', 4.5], ['indice', 'indice-fond', 4.5],
  ['accent', 'zone', 3], ['accent', 'selection', 3], ['trait-epais', 'case', 3],
];

describe("styles de l'appli", () => {
  test('6 styles, Rétro par défaut ; chacun a un nom', () => {
    assert.deepEqual([...STYLES], ['ardoise', 'ascii', 'ascii-generatif', 'bbs-ansi', 'ms-dos', 'retro']);
    assert.equal(STYLE_PAR_DEFAUT, 'retro');
    for (const id of STYLES) assert.ok(NOMS_STYLES[id].length > 0);
    assert.equal(estStyle('terminal'), false);
    assert.equal(estStyle('annees-80-90'), false);
  });

  test('index.html charge la feuille de chaque style, Rétro écrit par défaut, demarrage.js avant le code', () => {
    const index = readFileSync('public/index.html', 'utf8');
    for (const id of STYLES.filter((s) => s !== 'ardoise')) assert.ok(index.includes(`./styles/visuels/${id}.css`), id);
    assert.ok(index.includes('<html lang="fr" data-style="retro">'));
    assert.ok(index.includes('<script src="./demarrage.js"></script>'), 'script classique (ni module, ni defer, ni async)');
    assert.ok(index.indexOf('demarrage.js') < index.indexOf('main.js'));
  });

  test("une feuille par style conservé, rien de plus ; dossiers d'icônes de même", () => {
    const feuilles = readdirSync('src/styles/visuels').map((f) => f.replace(/\.css$/, '')).sort();
    assert.deepEqual(feuilles, STYLES.filter((s) => s !== 'ardoise'));
    assert.deepEqual(readdirSync('public/design').sort(), [...STYLES]);
  });

  test('chaque police a sa licence et sert à au moins un style ; chaque licence sert à une police', () => {
    const css = STYLES.map((id) => readFileSync(feuille(id), 'utf8')).join('\n');
    const polices = readdirSync('public/polices').filter((f) => /\.woff2?$/.test(f));
    const familles = new Set<string>();
    for (const fichier of polices) {
      assert.ok(css.includes(`polices/${fichier}`), `${fichier} n'est utilisée par aucun style`);
      familles.add(fichier.replace(/-\d{3}\.woff2$|\.woff$/, '').replace(/^px437-.*/, 'px437'));
    }
    const licences = readdirSync('public/polices/licences');
    for (const licence of licences) {
      const famille = licence.replace(/-ofl\.txt$/, '').replace(/^px437-.*/, 'px437');
      assert.ok(familles.has(famille), `licence orpheline : ${licence}`);
    }
  });

  test("manifest et barre d'état aux couleurs de fond de Rétro", () => {
    const retro = variablesDe('retro');
    const clair = resoudre('--couleur-fond', 'clair', retro, ARDOISE);
    const sombre = resoudre('--couleur-fond', 'sombre', retro, ARDOISE);
    const manifest: unknown = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    assert.ok(manifest !== null && typeof manifest === 'object');
    assert.equal(Reflect.get(manifest, 'background_color'), clair);
    assert.equal(Reflect.get(manifest, 'theme_color'), clair);
    const index = readFileSync('public/index.html', 'utf8');
    assert.ok(index.includes(`content="${clair}" media="(prefers-color-scheme: light)"`));
    assert.ok(index.includes(`content="${sombre}" media="(prefers-color-scheme: dark)"`));
  });

  for (const id of STYLES) {
    describe(id, () => {
      const variables = variablesDe(id);

      test('toutes les couleurs définies, en clair et en sombre', () => {
        for (const nom of COULEURS) {
          if (id !== 'ardoise') assert.ok(variables.has(nom), `${nom} manquante`);
          for (const mode of ['clair', 'sombre'] as const) {
            assert.ok(rvb(resoudre(nom, mode, variables, ARDOISE)) !== null, `${nom} (${mode}) n'est pas une couleur #rrggbb`);
          }
        }
      });

      for (const mode of ['clair', 'sombre'] as const satisfies readonly Mode[]) {
        test(`contrastes suffisants (${mode})`, () => {
          const echecs: string[] = [];
          for (const [texte, fond, minimum] of PAIRES) {
            const a = rvb(resoudre(`--couleur-${texte}`, mode, variables, ARDOISE));
            const b = rvb(resoudre(`--couleur-${fond}`, mode, variables, ARDOISE));
            if (a === null || b === null) continue; // signalé par le test précédent
            const r = contraste(a, b);
            if (r < minimum) echecs.push(`${texte} sur ${fond} : ${r.toFixed(2)} < ${minimum}`);
          }
          assert.deepEqual(echecs, []);
        });
      }

      test('une icône dessinée pour chaque nom, et chaque dessin utilisé', () => {
        const css = readFileSync(id === 'ardoise' ? 'src/styles/icones.css' : feuille(id), 'utf8');
        for (const nom of NOMS_ICONES) {
          assert.ok(existsSync(`public/design/${id}/icones/${nom}.svg`), `${nom}.svg manquant`);
          assert.ok(css.includes(`design/${id}/icones/${nom}.svg`), `${nom} non relié dans la feuille`);
        }
      });

      test('polices présentes et licence fournie', () => {
        const css = readFileSync(feuille(id), 'utf8');
        for (const m of css.matchAll(/url\("\.\.\/\.\.\/polices\/([^"]+)"\)/g)) {
          const fichier = m[1] ?? '';
          assert.ok(existsSync(`public/polices/${fichier}`), `${fichier} manquant`);
          const famille = fichier.replace(/-\d{3}\.woff2$|\.woff$/, '');
          const licence = famille.startsWith('px437-') ? 'px437-cc-by-sa-4.0.txt' : `${famille}-ofl.txt`;
          assert.ok(existsSync(`public/polices/licences/${licence}`), `licence de ${famille} manquante`);
        }
      });
    });
  }
});
