// Tests de public/demarrage.js (style et thème posés avant le premier affichage) et de la copie locale
// qu'il lit (src/socle/style/affichage.ts). Le script est exécuté tel quel dans un bac à sable (node:vm),
// avec un faux document et un faux stockage local.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { runInNewContext } from 'node:vm';
import {
  CLE_AFFICHAGE,
  CLE_ESSAI,
  ecrireAffichage,
  lireEssai,
  oublierEssai,
  styleDeLEssai,
  type StockageLocal,
} from '../../../src/socle/style/affichage.ts';
import { STYLES } from '../../../src/types/style.ts';

const SCRIPT = readFileSync('public/demarrage.js', 'utf8');

type Memoire = StockageLocal & { contenu: Record<string, string> };

function memoire(depart: Record<string, string> = {}): Memoire {
  const contenu = { ...depart };
  return {
    contenu,
    getItem: (cle) => contenu[cle] ?? null,
    setItem: (cle, valeur) => {
      contenu[cle] = valeur;
    },
    removeItem: (cle) => {
      delete contenu[cle];
    },
  };
}

const EN_PANNE: StockageLocal = {
  getItem: () => {
    throw new Error('bloqué');
  },
  setItem: () => {
    throw new Error('bloqué');
  },
  removeItem: () => {
    throw new Error('bloqué');
  },
};

/** Exécute demarrage.js ; renvoie les attributs de <html> (au départ : data-style="retro", comme index.html). */
function demarrer(stockage: StockageLocal | 'inaccessible'): Record<string, string> {
  const attributs: Record<string, string> = { 'data-style': 'retro', 'data-theme': 'ancien' };
  const document = {
    documentElement: {
      setAttribute: (nom: string, valeur: string) => {
        attributs[nom] = valeur;
      },
      removeAttribute: (nom: string) => {
        delete attributs[nom];
      },
    },
  };
  const window = {};
  Object.defineProperty(window, 'localStorage', {
    get: () => {
      if (stockage === 'inaccessible') throw new Error('accès refusé');
      return stockage;
    },
  });
  runInNewContext(SCRIPT, { window, document, JSON });
  return attributs;
}

const copie = (style: unknown, theme: unknown): Record<string, string> => ({ [CLE_AFFICHAGE]: JSON.stringify({ style, theme }) });

describe('demarrage.js : style et thème avant le premier affichage', () => {
  test('même liste de styles que src/types/style.ts', () => {
    const m = /var STYLES = (\[[^\]]*\]);/.exec(SCRIPT);
    assert.ok(m?.[1] !== undefined);
    assert.deepEqual(JSON.parse(m[1].replaceAll("'", '"')), [...STYLES]);
  });

  test('copie lue : style et thème posés (chaque style)', () => {
    for (const style of STYLES) {
      assert.deepEqual(demarrer(memoire(copie(style, 'sombre'))), { 'data-style': style, 'data-theme': 'sombre' });
    }
    assert.deepEqual(demarrer(memoire(copie('ms-dos', 'clair'))), { 'data-style': 'ms-dos', 'data-theme': 'clair' });
  });

  test('thème automatique : pas de data-theme', () => {
    assert.deepEqual(demarrer(memoire(copie('ascii', 'systeme'))), { 'data-style': 'ascii' });
  });

  test('copie écrite par ecrireAffichage, relue par le script', () => {
    const s = memoire();
    ecrireAffichage(s, { style: 'bbs-ansi', theme: 'clair' });
    assert.deepEqual(demarrer(s), { 'data-style': 'bbs-ansi', 'data-theme': 'clair' });
  });

  test('rien d’enregistré (nouvelle installation) : Rétro, thème automatique', () => {
    assert.deepEqual(demarrer(memoire()), { 'data-style': 'retro' });
  });

  test('sans copie, ancien choix d’essai repris ; style retiré → Rétro', () => {
    assert.deepEqual(demarrer(memoire({ [CLE_ESSAI]: 'ms-dos' })), { 'data-style': 'ms-dos' });
    assert.deepEqual(demarrer(memoire({ [CLE_ESSAI]: 'terminal' })), { 'data-style': 'retro' });
    assert.deepEqual(demarrer(memoire({ [CLE_ESSAI]: 'annees-80-90' })), { 'data-style': 'retro' });
    // La copie, plus récente, l'emporte
    assert.deepEqual(demarrer(memoire({ [CLE_ESSAI]: 'ms-dos', ...copie('ascii', 'systeme') })), { 'data-style': 'ascii' });
  });

  test('copie abîmée ou stockage inaccessible : Rétro, sans erreur', () => {
    assert.deepEqual(demarrer(memoire({ [CLE_AFFICHAGE]: '{pas du json' })), { 'data-style': 'retro' });
    assert.deepEqual(demarrer(memoire(copie('terminal', 'violet'))), { 'data-style': 'retro' });
    assert.deepEqual(demarrer(memoire({ [CLE_AFFICHAGE]: '"texte"' })), { 'data-style': 'retro' });
    assert.deepEqual(demarrer(EN_PANNE), { 'data-style': 'retro' });
    assert.deepEqual(demarrer('inaccessible'), { 'data-style': 'retro' });
  });
});

describe('copie locale et reprise de l’essai (affichage.ts)', () => {
  test('styleDeLEssai : style conservé tel quel, style retiré ou inconnu → Rétro, rien → null', () => {
    assert.equal(styleDeLEssai('ardoise'), 'ardoise');
    assert.equal(styleDeLEssai('ascii-generatif'), 'ascii-generatif');
    assert.equal(styleDeLEssai('terminal'), 'retro');
    assert.equal(styleDeLEssai('annees-80-90'), 'retro');
    assert.equal(styleDeLEssai('inconnu'), 'retro');
    assert.equal(styleDeLEssai(null), null);
  });

  test('lireEssai puis oublierEssai : la clé disparaît, rien à reprendre ensuite', () => {
    const s = memoire({ [CLE_ESSAI]: 'bbs-ansi' });
    assert.equal(lireEssai(s), 'bbs-ansi');
    oublierEssai(s);
    assert.equal(s.contenu[CLE_ESSAI], undefined);
    assert.equal(lireEssai(s), null);
  });

  test('stockage absent ou en panne : aucune erreur', () => {
    assert.equal(lireEssai(null), null);
    assert.equal(lireEssai(EN_PANNE), null);
    assert.doesNotThrow(() => oublierEssai(EN_PANNE));
    assert.doesNotThrow(() => ecrireAffichage(EN_PANNE, { style: 'retro', theme: 'systeme' }));
    assert.doesNotThrow(() => ecrireAffichage(null, { style: 'retro', theme: 'systeme' }));
  });

  test('copie : uniquement le style et le thème', () => {
    const s = memoire();
    ecrireAffichage(s, { style: 'ardoise', theme: 'sombre' });
    assert.deepEqual(JSON.parse(s.contenu[CLE_AFFICHAGE] ?? ''), { style: 'ardoise', theme: 'sombre' });
  });
});
