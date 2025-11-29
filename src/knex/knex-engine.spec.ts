import { KnexEngine } from './knex-engine';
import { KnexTransaction } from './knex-transaction';
import * as Knex from 'knex';
import { beforeEach, describe, it, expect, afterEach } from 'vitest';

describe(KnexEngine, () => {
  let knex: Knex.Knex;
  let engine: KnexEngine;

  beforeEach(() => {
    knex = Knex.knex({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });

    engine = new KnexEngine(knex);
  });

  afterEach(() => knex.destroy());

  describe('createTransaction', () => {
    it('should create a transaction', async () => {
      // act
      const transaction = await engine.createTransaction();

      // assert
      expect(transaction).toBeInstanceOf(KnexTransaction);
    });

    it('should create and begin a transaction if it is global', async () => {
      // act
      const transaction = await engine.createTransaction({
        global: true,
      });

      // assert
      expect(transaction).toBeInstanceOf(KnexTransaction);
      expect(transaction.knex.client.transacting).toBe(true);
      await transaction.rollback();
    });
  });
});
