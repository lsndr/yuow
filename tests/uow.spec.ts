import { Knex, knex } from 'knex';
import { PersistenceError, Uow, uowFactory } from '../src';
import { Customer } from './model/customer';
import { CustomerRepository } from './repositories/customer.repository';
import { resolve } from 'path';

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

  describe('Local Transaction', () => {
    it('should persist a new customer', async () => {
      let attempts = 0;
      const id = '2d2cdc62-f70e-4f1b-9407-b0702a72384a';
      const name = 'Ted Cannon';

      await uow((ctx) => {
        attempts++;

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
        id: '2d2cdc62-f70e-4f1b-9407-b0702a72384a',
        name: 'Ted Cannon',
        version: 1,
      });
      expect(attempts).toBe(1);
    });

    it('should persist the same customer only once', async () => {
      let attempts = 0;
      const id = '524f314e-700f-4467-8648-df08587fda8a';
      const name = 'Gerald Silva';

      await uow((ctx) => {
        attempts++;

        const customerRepository = ctx.getRepository(CustomerRepository);

        const customer = Customer.create(id, name);

        customerRepository.add(customer);
        customerRepository.add(customer);
      });

      const record = await client
        .select('*')
        .from('customers')
        .where('id', id)
        .first();

      expect(record).toEqual({
        id: '524f314e-700f-4467-8648-df08587fda8a',
        name: 'Gerald Silva',
        version: 1,
      });
      expect(attempts).toBe(1);
    });

    it('should not add different customer with the same id to the repository', async () => {
      let attempts = 0;
      const id = '815a6749-5cf6-44e9-84e7-429bc008b3dc';
      const name = 'Jasmine Hill';

      await uow((ctx) => {
        attempts++;

        const customerRepository = ctx.getRepository(CustomerRepository);

        const customer1 = Customer.create(id, name);
        const customer2 = Customer.create(id, name);

        const added1 = customerRepository.add(customer1);
        const added2 = customerRepository.add(customer2);

        expect(added1).toBe(true);
        expect(added2).toBe(false);
      });

      const record = await client
        .select('*')
        .from('customers')
        .where('id', id)
        .first();

      expect(record).toEqual({
        id: '815a6749-5cf6-44e9-84e7-429bc008b3dc',
        name: 'Jasmine Hill',
        version: 1,
      });
      expect(attempts).toBe(1);
    });

    it('should update an exisitng customer', async () => {
      let attempts = 0;
      const id = 'adcde8c4-6211-49ba-9e5a-5fd3d2b98957';

      await client
        .insert({
          id,
          name: 'Leslie Cunningham',
          version: 1,
        })
        .into('customers');

      await uow(async (ctx) => {
        attempts++;

        const customerRepository = ctx.getRepository(CustomerRepository);

        const customer = await customerRepository.findById(id);

        if (!customer) {
          throw new Error('Customer not found');
        }

        customer.changeName('Billy Wagner');
      });

      const record = await client
        .select('*')
        .from('customers')
        .where('id', id)
        .first();

      expect(record).toEqual({
        id: 'adcde8c4-6211-49ba-9e5a-5fd3d2b98957',
        name: 'Billy Wagner',
        version: 2,
      });
      expect(attempts).toBe(1);
    });

    it('should always return the same reference', async () => {
      const id = 'adcde8c4-6211-49ba-9e5a-5fd3d2b98957';

      await client
        .insert({
          id,
          name: 'Shaun Daniel',
          version: 1,
        })
        .into('customers');

      await uow(async (ctx) => {
        const customerRepository = ctx.getRepository(CustomerRepository);

        const customer1 = await customerRepository.findById(id);
        const customer2 = await customerRepository.findById(id);

        expect(customer1).not.toBeUndefined();
        expect(customer1).toBe(customer2);
      });
    });

    it('should propagate an error', () => {
      let attempts = 0;

      const action = () =>
        uow(() => {
          attempts++;
          throw new Error('Test error');
        });

      expect(action()).rejects.toThrowError('Test error');
      expect(attempts).toBe(1);
    });

    it('should propagate a result', async () => {
      const result = await uow(() => {
        return 'test result';
      });

      expect(result).toBe('test result');
    });

    it('should update an exisiting customer on third attempt', async () => {
      let attempts = 0;
      const id = '95dd88db-e52e-4213-86aa-a757563c034d';

      await client
        .insert({
          id,
          name: 'Archie Reese',
          version: 1,
        })
        .into('customers');

      const modify = () =>
        client.raw(
          `UPDATE customers SET version = version + 1 WHERE id = '${id}'`,
        );

      await uow(async (ctx) => {
        attempts++;

        const customerRepository = ctx.getRepository(CustomerRepository);

        const customer = await customerRepository.findById(id);

        if (!customer) {
          throw new Error('Customer not found');
        }

        customer.changeName('Hector Chambers');

        if (attempts < 3) {
          await modify();
        }
      });

      const record = await client
        .select('*')
        .from('customers')
        .where('id', id)
        .first();

      expect(record).toEqual({
        id: '95dd88db-e52e-4213-86aa-a757563c034d',
        name: 'Hector Chambers',
        version: 4,
      });
      expect(attempts).toBe(3);
    });

    it('should fail to update an exisiting customer because of a persistence error', async () => {
      let attempts = 0;
      const id = '71bf5067-891f-4d75-b727-5751a84446bc';

      await client
        .insert({
          id,
          name: 'Vivian Bridges',
          version: 1,
        })
        .into('customers');

      const modify = () =>
        client.raw(
          `UPDATE customers SET version = version + 1 WHERE id = '${id}'`,
        );

      const action = () =>
        uow(async (ctx) => {
          attempts++;

          const customerRepository = ctx.getRepository(CustomerRepository);

          const customer = await customerRepository.findById(id);

          if (!customer) {
            throw new Error('Customer not found');
          }

          customer.changeName('Toni Potter');

          if (attempts < 4) {
            await modify();
          }
        });

      await expect(action()).rejects.toThrowError(PersistenceError);

      const record = await client
        .select('*')
        .from('customers')
        .where('id', id)
        .first();

      expect(record).toEqual({
        id: '71bf5067-891f-4d75-b727-5751a84446bc',
        name: 'Vivian Bridges',
        version: 4,
      });
      expect(attempts).toBe(3);
    });

    it('should update an exisiting customer on seventh attempt', async () => {
      let attempts = 0;
      const id = '39852832-f07b-49f9-9fe3-bec3a64c8d3f';

      await client
        .insert({
          id,
          name: 'Percy Mcbride',
          version: 1,
        })
        .into('customers');

      const modify = () =>
        client.raw(
          `UPDATE customers SET version = version + 1 WHERE id = '${id}'`,
        );

      await uow(
        async (ctx) => {
          attempts++;

          const customerRepository = ctx.getRepository(CustomerRepository);

          const customer = await customerRepository.findById(id);

          if (!customer) {
            throw new Error('Customer not found');
          }

          customer.changeName('Wilbur Nash');

          if (attempts < 7) {
            await modify();
          }
        },
        {
          retries: 7,
        },
      );

      const record = await client
        .select('*')
        .from('customers')
        .where('id', id)
        .first();

      expect(record).toEqual({
        id: '39852832-f07b-49f9-9fe3-bec3a64c8d3f',
        name: 'Wilbur Nash',
        version: 8,
      });
      expect(attempts).toBe(7);
    });
  });

  describe('Global Transaction', () => {
    it('should persist a new customer', async () => {
      let attempts = 0;
      const id = '2d2cdc62-f70e-4f1b-9407-b0702a72384a';
      const name = 'Ted Cannon';

      await uow(
        (ctx) => {
          attempts++;

          const customerRepository = ctx.getRepository(CustomerRepository);

          const customer = Customer.create(id, name);

          customerRepository.add(customer);
        },
        {
          globalTransaction: true,
        },
      );

      const record = await client
        .select('*')
        .from('customers')
        .where('id', id)
        .first();

      expect(record).toEqual({
        id: '2d2cdc62-f70e-4f1b-9407-b0702a72384a',
        name: 'Ted Cannon',
        version: 1,
      });
      expect(attempts).toBe(1);
    });

    it('should persist the same customer only once', async () => {
      let attempts = 0;
      const id = '524f314e-700f-4467-8648-df08587fda8a';
      const name = 'Gerald Silva';

      await uow(
        (ctx) => {
          attempts++;

          const customerRepository = ctx.getRepository(CustomerRepository);

          const customer = Customer.create(id, name);

          customerRepository.add(customer);
          customerRepository.add(customer);
        },
        {
          globalTransaction: true,
        },
      );

      const record = await client
        .select('*')
        .from('customers')
        .where('id', id)
        .first();

      expect(record).toEqual({
        id: '524f314e-700f-4467-8648-df08587fda8a',
        name: 'Gerald Silva',
        version: 1,
      });
      expect(attempts).toBe(1);
    });

    it('should update an exisitng customer', async () => {
      let attempts = 0;
      const id = 'adcde8c4-6211-49ba-9e5a-5fd3d2b98957';

      await client
        .insert({
          id,
          name: 'Leslie Cunningham',
          version: 1,
        })
        .into('customers');

      await uow(
        async (ctx) => {
          attempts++;

          const customerRepository = ctx.getRepository(CustomerRepository);

          const customer = await customerRepository.findById(id);

          if (!customer) {
            throw new Error('Customer not found');
          }

          customer.changeName('Billy Wagner');
        },
        {
          globalTransaction: true,
        },
      );

      const record = await client
        .select('*')
        .from('customers')
        .where('id', id)
        .first();

      expect(record).toEqual({
        id: 'adcde8c4-6211-49ba-9e5a-5fd3d2b98957',
        name: 'Billy Wagner',
        version: 2,
      });
      expect(attempts).toBe(1);
    });
  });
});
