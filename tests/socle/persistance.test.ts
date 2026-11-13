// Tests de la demande de stockage persistant : journalisée, jamais bloquante.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { demanderStockagePersistant } from '../../src/socle/stockage/persistance.ts';

describe('demanderStockagePersistant', () => {
  test('accordé, refusé, indisponible, erreur : toujours un résultat et un message', async () => {
    const messages: string[] = [];
    const journal = (m: string): void => {
      messages.push(m);
    };
    assert.equal(await demanderStockagePersistant({ persist: async () => true }, journal), true);
    assert.equal(await demanderStockagePersistant({ persist: async () => false }, journal), false);
    assert.equal(await demanderStockagePersistant(null, journal), null);
    const enErreur = {
      persist: async (): Promise<boolean> => {
        throw new Error('interdit');
      },
    };
    assert.equal(await demanderStockagePersistant(enErreur, journal), null);
    assert.equal(messages.length, 4);
    assert.match(messages[0] ?? '', /accordé/);
    assert.match(messages[1] ?? '', /refusé/);
    assert.match(messages[3] ?? '', /interdit/);
  });
});
