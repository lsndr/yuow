import { Knex, knex } from 'knex';
import { Uow, uowFactory } from '../../src';
import { resolve } from 'path';
import { CustomerRepository } from '../utils/customer.schema';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { Customer } from '../utils/customer';

describe('ORM – Update Existing Model', () => {
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

  it('should update an existing model', async () => {
    // arrange
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    const newName = faker.person.fullName();
    await uow((ctx) =>
      ctx
        .getRepository(CustomerRepository)
        .add(Customer.create({ id, name, cards: [] })),
    );

    // act
    await uow(async (ctx) => {
      const customer = await ctx
        .getRepository(CustomerRepository)
        .find((qb) => qb.where('id', id));

      customer?.changeName(newName);
    });

    // assert
    const model = await uow((ctx) =>
      ctx.getRepository(CustomerRepository).find((qb) => qb.where('id', id)),
    );

    expect(model?.id).toBe(id);
    expect(model?.name).toBe(newName);
  });
});
