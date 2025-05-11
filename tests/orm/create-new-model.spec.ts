import { Knex, knex } from 'knex';
import { Uow, uowFactory } from '../../src';
import { Customer } from '../utils/customer';
import { resolve } from 'path';
import { CustomerRepository } from '../utils/customer.schema';
import { faker } from '@faker-js/faker';

describe('ORM - Create New Model', () => {
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

  it('should persist a new model', async () => {
    // arrange
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    const cards = [
      faker.finance.creditCardNumber(),
      faker.finance.creditCardNumber(),
    ];

    // act
    await uow((ctx) => {
      ctx
        .getRepository(CustomerRepository)
        .add(Customer.create({ id, name, cards }));
    });

    // assert
    const model = await uow((ctx) =>
      ctx.getRepository(CustomerRepository).find((qb) => qb.where('id', id)),
    );

    expect(model?.id).toBe(id);
    expect(model?.name).toBe(name);
    expect(model?.cards).toEqual(cards);
  });
});
