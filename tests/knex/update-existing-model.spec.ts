import { resolve } from 'path';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { type Knex, knex } from 'knex';
import {
  KnexEngine,
  type KnexTransactionEvents,
  type KnexTransaction,
  type KnexTransactionOptions,
} from '../../src/knex';
import { Uow } from '../../src/core';
import { CustomerRepository } from './utils/customer.schema';
import { Customer } from './utils/customer';

describe('ORM – Update Existing Model', () => {
  let db: Knex;
  let uow: Uow<
    KnexEngine,
    KnexTransaction,
    KnexTransactionOptions,
    KnexTransactionEvents
  >;

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
      migrations: {
        directory: resolve(__dirname, 'migrations'),
      },
    });

    uow = new Uow(new KnexEngine(db));

    await db.migrate.up();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('should update an existing model', async () => {
    // arrange
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    const newName = faker.person.fullName();
    await uow.run((ctx) =>
      ctx
        .getRepository(CustomerRepository)
        .add(Customer.create({ id, name, cards: [] })),
    );

    // act
    await uow.run(async (ctx) => {
      const customer = await ctx
        .getRepository(CustomerRepository)
        .find((qb) => qb.where('id', id));

      customer?.changeName(newName);
    });

    // assert
    const model = await uow.run((ctx) =>
      ctx.getRepository(CustomerRepository).find((qb) => qb.where('id', id)),
    );

    expect(model?.id).toBe(id);
    expect(model?.name).toBe(newName);
  });
});
