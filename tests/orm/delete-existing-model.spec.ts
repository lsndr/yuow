import { Knex, knex } from 'knex';
import {
  KnexEngine,
  KnexTransaction,
  KnexTransactionOptions,
  Uow,
} from '../../src';
import { resolve } from 'path';
import { CustomerRepository } from '../utils/customer.schema';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { Customer } from '../utils/customer';

describe('ORM – Delete Existing Model', () => {
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

  it('should delete an existing model', async () => {
    // arrange
    const id = faker.string.uuid();
    await uow.run((ctx) =>
      ctx
        .getRepository(CustomerRepository)
        .add(Customer.create({ id, name: faker.person.fullName(), cards: [] })),
    );

    // act
    await uow.run(async (ctx) => {
      const customerRepository = ctx.getRepository(CustomerRepository);

      const customer = await customerRepository.find((queryBuilder) =>
        queryBuilder.where('id', id),
      );

      if (!customer) {
        throw new Error('Customer not found');
      }

      customerRepository.delete(customer);
    });

    // assert
    const model = await uow.run((ctx) =>
      ctx.getRepository(CustomerRepository).find((qb) => qb.where('id', id)),
    );

    expect(model).toBeUndefined();
  });
});
