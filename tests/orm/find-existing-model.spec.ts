import { Knex, knex } from 'knex';
import {
  KnexTransaction,
  KnexTransactionOptions,
  KnexEngine,
} from '../../src/knex';
import { Uow } from '../../src/core';
import { resolve } from 'path';
import { CustomerRepository } from '../utils/customer.schema';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { Customer } from '../utils/customer';

describe('ORM – Find Existing Model', () => {
  let db: Knex;
  let uow: Uow<KnexEngine, KnexTransaction, KnexTransactionOptions>;

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
      migrations: {
        directory: resolve(__dirname, '../migrations'),
      },
    });

    uow = new Uow(new KnexEngine(db));

    await db.migrate.up();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('should find existing model', async () => {
    // arrange
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    await uow.run((ctx) =>
      ctx
        .getRepository(CustomerRepository)
        .add(Customer.create({ id, name, cards: [] })),
    );

    // act
    const result = await uow.run((ctx) =>
      ctx
        .getRepository(CustomerRepository)
        .find((queryBuilder) => queryBuilder.where('id', id)),
    );

    // assert
    expect(result).toBeInstanceOf(Customer);
    expect(result?.id).toBe(id);
    expect(result?.name).toBe(name);
  });

  it("should fail to find model if it doesn't exist", async () => {
    // arrange
    await uow.run((ctx) =>
      ctx.getRepository(CustomerRepository).add(
        Customer.create({
          id: faker.string.uuid(),
          name: faker.person.fullName(),
          cards: [],
        }),
      ),
    );

    // act
    const result = await uow.run((ctx) =>
      ctx
        .getRepository(CustomerRepository)
        .find((queryBuilder) => queryBuilder.where('id', crypto.randomUUID())),
    );

    // assert
    expect(result).toBeUndefined();
  });
});
