import { KnexTransaction } from './knex-transaction';
import { type Schema } from './schema';
import { type Entity } from '../../tests/.config/entities/entity';
import { createEntitySchema } from '../../tests/.config/entities/entity.schema';
import { createKnexConnection } from '../../tests/.config/knex/connection';
import { faker } from '@faker-js/faker';
import { type Knex } from 'knex';
import { beforeEach, describe, it, expect, afterEach } from 'vitest';

describe(KnexTransaction, () => {
  let transaction: KnexTransaction;
  let knex: Knex;
  let schema: Schema<Entity>;

  beforeEach(async () => {
    const entity = createEntitySchema();

    schema = entity.schema;
    knex = await createKnexConnection(entity.migration);
    transaction = new KnexTransaction(knex);
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
      await transaction.knex(schema.options.table).insert(data);

      // act
      await transaction.commit();

      // assert
      const result = await knex(schema.options.table)
        .where({ id: data.id })
        .first();
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
      await transaction.knex(schema.options.table).insert(data);

      // act
      await transaction.rollback();

      // assert
      const result = await knex(schema.options.table)
        .where({ id: data.id })
        .first();
      expect(result).toBeUndefined();
    });
  });
});
