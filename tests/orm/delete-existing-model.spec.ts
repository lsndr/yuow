import { Knex, knex } from 'knex';
import { Uow, uowFactory } from '../../src';
import { resolve } from 'path';
import { CustomerRepository } from '../utils/customer.schema';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { Customer } from '../utils/customer';

describe('ORM – Delete Existing Model', () => {
  let db: Knex;
  let uow: Uow;

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
      migrations: {
        directory: resolve(__dirname, '../migrations'),
      },
    });

    uow = uowFactory(db);

    await db.migrate.up();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('should delete an existing model', async () => {
    // arrange
    const id = faker.string.uuid();
    await uow((ctx) =>
      ctx
        .getRepository(CustomerRepository)
        .add(Customer.create(id, faker.person.fullName())),
    );

    // act
    await uow(async (ctx) => {
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
    const model = await uow((ctx) =>
      ctx.getRepository(CustomerRepository).find((qb) => qb.where('id', id)),
    );

    expect(model).toBeUndefined();
  });
});
