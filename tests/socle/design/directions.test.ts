// Tests des directions de design à l'essai (étape 6b) : choix enregistré, variables complètes,
// contrastes suffisants en clair ET en sombre, icônes et polices présentes.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import {
  attributDirection,
  CLE_DIRECTION,
  DIRECTIONS,
  ecrireDirection,
  lireDirection,
  type StockageLocal,
} from '../../../src/socle/design/directions.ts';
import { NOMS_ICONES } from '../../../src/socle/icones.ts';
import { contraste, lireBloc, resoudre, rvb, type Mode, type Variables } from './lecture-css.ts';

const THEME = 'src/styles/theme.css';
const feuille = (id: string): string => (id === 'ardoise' ? THEME : `src/styles/directions/${id}.css`);
const ARDOISE = lireBloc(THEME, ':root');
const variablesDe = (id: string): Variables =>
  id === 'ardoise' ? ARDOISE : lireBloc(feuille(id), `:root[data-direction="${id}"]`);

/** Couleurs que chaque direction doit redéfinir (les autres peuvent garder celles d'Ardoise). */
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

function memoire(depart: Record<string, string> = {}): StockageLocal & { contenu: Record<string, string> } {
  const contenu = { ...depart };
  return {
    contenu,
    getItem: (cle) => contenu[cle] ?? null,
    setItem: (cle, valeur) => {
      contenu[cle] = valeur;
    },
  };
}

describe('directions de design (étape 6b)', () => {
  test('8 choix : Ardoise puis les 7 directions proposées', () => {
    assert.deepEqual(
      DIRECTIONS.map((d) => d.id),
      ['ardoise', 'annees-80-90', 'ascii', 'ms-dos', 'bbs-ansi', 'retro', 'ascii-generatif', 'terminal'],
    );
  });

  test('choix enregistré, relu ; inconnu, absent ou stockage en panne → Ardoise', () => {
    const s = memoire();
    assert.equal(lireDirection(s), 'ardoise');
    ecrireDirection(s, 'terminal');
    assert.equal(s.contenu[CLE_DIRECTION], 'terminal');
    assert.equal(lireDirection(s), 'terminal');
    assert.equal(lireDirection(memoire({ [CLE_DIRECTION]: 'inconnue' })), 'ardoise');
    assert.equal(lireDirection(null), 'ardoise');
    const enPanne: StockageLocal = {
      getItem: () => {
        throw new Error('bloqué');
      },
      setItem: () => {
        throw new Error('bloqué');
      },
    };
    assert.equal(lireDirection(enPanne), 'ardoise');
    assert.doesNotThrow(() => ecrireDirection(enPanne, 'retro'));
  });

  test('Ardoise = pas d\'attribut data-direction', () => {
    assert.equal(attributDirection('ardoise'), null);
    assert.equal(attributDirection('ms-dos'), 'ms-dos');
  });

  test('index.html charge la feuille de chaque direction', () => {
    const index = readFileSync('public/index.html', 'utf8');
    for (const { id } of DIRECTIONS.filter((d) => d.id !== 'ardoise')) {
      assert.ok(index.includes(`./styles/directions/${id}.css`), id);
    }
  });

  for (const { id } of DIRECTIONS) {
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
