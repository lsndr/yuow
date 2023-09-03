import { Knex, knex } from 'knex';
import { Uow, uowFactory } from '../src';
import { Customer } from './model/customer';
import { resolve } from 'path';
import { CustomerRepository } from './schemas/customer.schema';

describe('Unit of Work', () => {
  let client: Knex;
  let uow: Uow;

  beforeEach(async () => {
    client = knex({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
      migrations: {
        directory: resolve(__dirname, 'migrations'),
      },
    });

    uow = uowFactory(client);

    await client.migrate.up();
  });

  afterEach(async () => {
    await client.destroy();
  });

  it('should persist a new customer', async () => {
    const id = '9ea6b292-04ce-5332-9f0a-7ad7f6712abd';
    const name = 'Blake Watkins';

    await uow((ctx) => {
      const customerRepository = ctx.getRepository(CustomerRepository);

      const customer = Customer.create(id, name);

      customerRepository.add(customer);
    });

    const record = await client
      .select('*')
      .from('customers')
      .where('id', id)
      .first();

    expect(record).toEqual({
      id,
      name,
      version: 1,
    });
  });

  it('should find a persisted customer', async () => {
    const id = '9ea6b292-04ce-5332-9f0a-7ad7f6712abd';
    const name = 'Blake Watkins';

    await uow((ctx) => {
      const customerRepository = ctx.getRepository(CustomerRepository);

      const customer = Customer.create(id, name);

      customerRepository.add(customer);
    });

    const result = await uow((ctx) => {
      const customerRepository = ctx.getRepository(CustomerRepository);

      return customerRepository.find((queryBuilder) =>
        queryBuilder.where('id', id),
      );
    });

    expect(result).toBeInstanceOf(Customer);
    // @ts-expect-error
    expect(result.id).toBe(id);
    // TODO: fix
    // @ts-expect-error
    expect(result.name).toBe(name);
  });
});
