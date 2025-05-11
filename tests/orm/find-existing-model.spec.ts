import { Knex, knex } from 'knex';
import { Uow, uowFactory } from '../../src';
import { resolve } from 'path';
import { CustomerRepository } from '../utils/customer.schema';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { Customer } from '../utils/customer';

describe('ORM – Find Existing Model', () => {
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

  it('should find existing model', async () => {
    // arrange
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    await uow((ctx) =>
      ctx.getRepository(CustomerRepository).add(Customer.create(id, name)),
    );

    // act
    const result = await uow((ctx) =>
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
    await uow((ctx) =>
      ctx
        .getRepository(CustomerRepository)
        .add(Customer.create(faker.string.uuid(), faker.person.fullName())),
    );

    // act
    const result = await uow((ctx) =>
      ctx
        .getRepository(CustomerRepository)
        .find((queryBuilder) => queryBuilder.where('id', crypto.randomUUID())),
    );

    // assert
    expect(result).toBeUndefined();
  });
});
