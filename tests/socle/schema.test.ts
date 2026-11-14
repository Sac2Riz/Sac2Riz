// Tests des migrations du schéma de stockage.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { migrer, MIGRATIONS, VERSION_SCHEMA, type BaseEnMigration, type Migration } from '../../src/socle/stockage/schema.ts';
import { NOMS_MAGASINS } from '../../src/socle/stockage/stockage.ts';

/** Base factice : la liste des magasins et le journal des opérations. */
function baseFactice(magasinsInitiaux: string[] = []): BaseEnMigration & { journal: string[]; liste: Set<string> } {
  const liste = new Set(magasinsInitiaux);
  const journal: string[] = [];
  return {
    liste,
    journal,
    creerMagasin: (nom) => {
      if (liste.has(nom)) throw new Error(`existe déjà : ${nom}`);
      liste.add(nom);
      journal.push(`+${nom}`);
    },
    supprimerMagasin: (nom) => {
      liste.delete(nom);
      journal.push(`-${nom}`);
    },
    magasins: () => [...liste],
  };
}

describe('schéma de stockage', () => {
  test('base neuve : toutes les migrations donnent exactement les magasins attendus', () => {
    const base = baseFactice();
    assert.equal(migrer(base, 0), VERSION_SCHEMA);
    assert.deepEqual([...base.liste].sort(), [...NOMS_MAGASINS].sort());
  });

  test('base à jour : aucune migration appliquée', () => {
    const base = baseFactice([...NOMS_MAGASINS]);
    assert.equal(migrer(base, VERSION_SCHEMA), VERSION_SCHEMA);
    assert.deepEqual(base.journal, []);
  });

  test('les migrations sont numérotées 1, 2, 3… sans trou', () => {
    MIGRATIONS.forEach((m, i) => assert.equal(m.version, i + 1));
  });

  test('seules les migrations postérieures sont appliquées, dans l\'ordre', () => {
    const migrations: Migration[] = [
      { version: 1, description: 'a', appliquer: (b) => b.creerMagasin('a') },
      { version: 2, description: 'b', appliquer: (b) => b.creerMagasin('b') },
      { version: 3, description: 'c', appliquer: (b) => b.supprimerMagasin('a') },
    ];
    const base = baseFactice(['a']);
    assert.equal(migrer(base, 1, migrations), 3);
    assert.deepEqual(base.journal, ['+b', '-a']);
  });

  test('migration n° 2 : une base de l\'étape 3a reçoit seulement le magasin « appli »', () => {
    const base = baseFactice(['parties', 'reserve', 'packsJoues', 'stats', 'reglages']);
    assert.equal(migrer(base, 1), 2);
    assert.deepEqual(base.journal, ['+appli']);
  });

  test('liste mal numérotée refusée', () => {
    const migrations: Migration[] = [{ version: 2, description: 'x', appliquer: () => undefined }];
    assert.throws(() => migrer(baseFactice(), 0, migrations), /mal numérotée/);
  });
});
