import { knex } from 'knex';
import { resolve } from 'path';
import { uowFactory } from 'yuow';
import { Customer } from './model/customer';
import { CustomerRepository } from './repositories/customer.repository';

const client = knex({
  client: 'sqlite3',
  connection: ':memory:',
  useNullAsDefault: true,
  migrations: {
    directory: resolve(__dirname, 'migrations'),
  },
});

const uow = uowFactory(client);

(async () => {
  await client.migrate.up();

  // Create customer

  const createResult = await uow((ctx) => {
    const customer = Customer.create('1', 'John Doe');

    const customerRepository = ctx.getRepository(CustomerRepository);
    customerRepository.add(customer);

    return {
      id: customer.id,
      name: customer.name,
    };
  });

  console.log(`Customer #${createResult.id} ${createResult.name} created`);

  // Update customer

  const updateResult = await uow(async (ctx) => {
    const customerRepository = ctx.getRepository(CustomerRepository);

    const customer = await customerRepository.findById('1');

    if (!customer) {
      throw new Error('Customer not found');
    }

    customer.changeName('Doe John');

    return {
      id: customer.id,
      name: customer.name,
    };
  });

  console.log(
    `Customer #${updateResult.id} changed name to ${updateResult.name}`,
  );
})().catch(console.error);
