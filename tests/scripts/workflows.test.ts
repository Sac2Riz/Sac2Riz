// Tests de la vérification des workflows GitHub Actions (scripts/verifier-workflows.ts).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { DOSSIER_WORKFLOWS, lireYaml, verifierWorkflow } from '../../scripts/verifier-workflows.ts';

/** Workflow minimal valide ; « etapes » : les lignes des étapes du job (retrait de 6 espaces). */
function workflow(etapes: readonly string[]): string {
  return ['name: Essai', 'on:', '  push:', '    branches: [main]', 'jobs:', '  construire:', '    runs-on: ubuntu-latest', '    steps:', ...etapes, ''].join('\n');
}

describe('workflows GitHub Actions', () => {
  test('les workflows du dépôt sont valides', () => {
    const fichiers = readdirSync(DOSSIER_WORKFLOWS).filter((f) => f.endsWith('.yml'));
    assert.ok(fichiers.length > 0);
    for (const f of fichiers) assert.deepEqual(verifierWorkflow(readFileSync(join(DOSSIER_WORKFLOWS, f), 'utf8')), [], f);
  });

  test("l'erreur de l'étape 6a est détectée : « : » dans un libellé non cité", () => {
    const fautif = workflow([
      "      - name: Récupérer le code (avec tout l'historique : date du build, voir scripts/date-build.ts)",
      '        uses: actions/checkout@v7',
    ]);
    const [erreur] = verifierWorkflow(fautif);
    assert.match(erreur ?? '', /^ligne 9 : « : » suivi d'une espace/);
    // La même valeur entre guillemets est acceptée
    const corrige = workflow([
      "      - name: \"Récupérer le code (avec tout l'historique : date du build)\"",
      '        uses: actions/checkout@v7',
      '        with:',
      '          fetch-depth: 0',
    ]);
    assert.deepEqual(verifierWorkflow(corrige), []);
  });

  test('lecture : tables, listes, citations, listes courtes, texte sur plusieurs lignes, commentaires', () => {
    const texte = [
      '# commentaire',
      'name: "Déployer : tout"',
      'on:',
      '  push:',
      '    branches: [main, dev]  # deux branches',
      '  workflow_dispatch:',
      'jobs:',
      '  a:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      "      - run: echo 'ok'",
      '      - name: Plusieurs lignes',
      '        run: |',
      '          npm ci',
      '',
      '          npm test',
      '      - uses: x/y@v1',
      '        with:',
      "          chemin: 'a''b'",
      '          url: ${{ steps.p.outputs.url }}',
    ].join('\n');
    assert.deepEqual(lireYaml(texte), {
      name: 'Déployer : tout',
      on: { push: { branches: ['main', 'dev'] }, workflow_dispatch: null },
      jobs: {
        a: {
          'runs-on': 'ubuntu-latest',
          steps: [
            { run: "echo 'ok'" },
            { name: 'Plusieurs lignes', run: 'npm ci\n\nnpm test' },
            { uses: 'x/y@v1', with: { chemin: "a'b", url: '${{ steps.p.outputs.url }}' } },
          ],
        },
      },
    });
    assert.deepEqual(verifierWorkflow(texte), []);
  });

  test('erreurs de syntaxe : tabulation, retrait, clé en double, guillemet non fermé, indicateur', () => {
    assert.match(verifierWorkflow('name: a\n\tjobs: b')[0] ?? '', /tabulation/);
    assert.match(verifierWorkflow(workflow(['      - run: a', '         uses: b']))[0] ?? '', /retrait inattendu/);
    assert.match(verifierWorkflow('name: a\nname: b')[0] ?? '', /clé en double/);
    assert.match(verifierWorkflow(workflow(['      - run: "echo']))[0] ?? '', /mal fermée/);
    assert.match(verifierWorkflow(workflow(['      - run: *ancre']))[0] ?? '', /ne peut pas commencer/);
    assert.match(verifierWorkflow('name:a')[0] ?? '', /clé: valeur/);
  });

  test('structure : jobs, runs-on, steps, uses ou run', () => {
    assert.match(verifierWorkflow('name: a\non: push')[0] ?? '', /jobs/);
    assert.match(verifierWorkflow(workflow(['      - name: rien']))[0] ?? '', /uses » OU « run/);
    assert.match(verifierWorkflow(workflow(['      - run: a', '        uses: b']))[0] ?? '', /uses » OU « run/);
    assert.match(verifierWorkflow(workflow(['      - uses: a', '        with: b']))[0] ?? '', /with/);
    assert.match(verifierWorkflow('name: a\non: push\njobs:\n  j:\n    steps:\n      - run: a')[0] ?? '', /runs-on/);
  });
});
