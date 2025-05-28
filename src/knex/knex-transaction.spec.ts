import * as Knex from 'knex';
import { resolve } from 'path';
import { KnexTransaction } from './knex-transaction';
import { faker } from '@faker-js/faker';

describe(KnexTransaction, () => {
  let transaction: KnexTransaction;
  let knex: Knex.Knex;

  beforeEach(async () => {
    knex = Knex.knex({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
      migrations: {
        directory: resolve(__dirname, '../../tests/utils/entities/migrations'),
      },
    });
    transaction = new KnexTransaction(knex);

    await knex.migrate.latest();
  });

  afterEach(() => knex.destroy());

  describe('constructor', () => {
    it('should initialize with knex instance', () => {
      expect(transaction.knex).toBe(knex);
    });
  });

  describe('begin', () => {
    it('should begin a transaction', async () => {
      // act
      await transaction.begin();

      // assert
      expect(transaction.knex.client.transacting).toBe(true);
      await transaction.rollback();
    });
  });

  describe('commit', () => {
    it('should commit changes', async () => {
      // arrange
      const data = {
        id: faker.string.uuid(),
        name: faker.person.firstName(),
        cards: JSON.stringify([faker.finance.creditCardNumber()]),
        version: faker.number.int(),
      };

      await transaction.begin();
      await transaction.knex('entity').insert(data);

      // act
      await transaction.commit();

      // assert
      const result = await knex('entity').where({ id: data.id }).first();
      expect(result).toEqual(data);
    });
  });

  describe('rollback', () => {
    it('should rollback changes', async () => {
      // arrange
      const data = {
        id: faker.string.uuid(),
        name: faker.person.firstName(),
        cards: JSON.stringify([faker.finance.creditCardNumber()]),
        version: faker.number.int(),
      };

      await transaction.begin();
      await transaction.knex('entity').insert(data);

      // act
      await transaction.rollback();

      // assert
      const result = await knex('entity').where({ id: data.id }).first();
      expect(result).toBeUndefined();
    });
  });
});
