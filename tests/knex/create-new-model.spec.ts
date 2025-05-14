import { resolve } from 'path';
import { faker } from '@faker-js/faker';
import { knex } from 'knex';
import type { Knex } from 'knex';
import type { KnexTransaction, KnexTransactionOptions } from '../../src/knex';
import { KnexEngine } from '../../src/knex';
import { Uow } from '../../src/core';
import { Customer } from './utils/customer';
import { CustomerRepository } from './utils/customer.schema';

describe('ORM - Create New Model', () => {
  let db: Knex;
  let uow: Uow<KnexEngine, KnexTransaction, KnexTransactionOptions>;

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

  it('should persist a new model', async () => {
    // arrange
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    const cards = [
      faker.finance.creditCardNumber(),
      faker.finance.creditCardNumber(),
    ];

    // act
    await uow.run((ctx) => {
      ctx
        .getRepository(CustomerRepository)
        .add(Customer.create({ id, name, cards }));
    });

    // assert
    const model = await uow.run((ctx) =>
      ctx.getRepository(CustomerRepository).find((qb) => qb.where('id', id)),
    );

    expect(model?.id).toBe(id);
    expect(model?.name).toBe(name);
    expect(model?.cards).toEqual(cards);
  });
});
