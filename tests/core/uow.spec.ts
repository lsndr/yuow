import { resolve } from 'path';
import { faker } from '@faker-js/faker';
import { knex } from 'knex';
import type { Knex } from 'knex';
import { RunError, Uow } from '../../src/core';
import { Customer } from './utils/customer';
import { CustomerRepository } from './utils/customer.repository';
import { KnexEngine } from './utils/knex.engine';
import type {
  KnexTransaction,
  KnexTransactionOptions,
} from './utils/knex.transaction';

describe('Unit of Work', () => {
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

  describe.each([{ global: true }, { global: false }])(
    'Transaction Config: %j',
    (transaction) => {
      it('should persist a new customer', async () => {
        let attempts = 0;
        const id = '2d2cdc62-f70e-4f1b-9407-b0702a72384a';
        const name = 'Ted Cannon';

        await uow.run(
          (ctx) => {
            attempts++;

            const customerRepository = ctx.getRepository(CustomerRepository);

            const customer = Customer.create({ id, name, cards: [] });

            customerRepository.add(customer);
          },
          { transaction },
        );

        const record = await db
          .select('*')
          .from('customers')
          .where('id', id)
          .first();

        expect(record).toEqual({
          id: '2d2cdc62-f70e-4f1b-9407-b0702a72384a',
          name: 'Ted Cannon',
          cards: '[]',
          version: 1,
        });
        expect(attempts).toBe(1);
      });

      it('should persist the same customer only once', async () => {
        let attempts = 0;
        const id = '524f314e-700f-4467-8648-df08587fda8a';
        const name = 'Gerald Silva';

        await uow.run(
          (ctx) => {
            attempts++;

            const customerRepository = ctx.getRepository(CustomerRepository);

            const customer = Customer.create({ id, name, cards: [] });

            customerRepository.add(customer);
            customerRepository.add(customer);
          },
          { transaction },
        );

        const record = await db
          .select('*')
          .from('customers')
          .where('id', id)
          .first();

        expect(record).toEqual({
          id: '524f314e-700f-4467-8648-df08587fda8a',
          name: 'Gerald Silva',
          cards: '[]',
          version: 1,
        });
        expect(attempts).toBe(1);
      });

      it('should not add different customer with the same id to the repository', async () => {
        let attempts = 0;
        const id = '815a6749-5cf6-44e9-84e7-429bc008b3dc';
        const name = 'Jasmine Hill';

        await uow.run(
          (ctx) => {
            attempts++;

            const customerRepository = ctx.getRepository(CustomerRepository);

            const customer1 = Customer.create({ id, name, cards: [] });
            const customer2 = Customer.create({ id, name, cards: [] });

            const added1 = customerRepository.add(customer1);
            const added2 = customerRepository.add(customer2);

            expect(added1).toBe(true);
            expect(added2).toBe(false);
          },
          { transaction },
        );

        const record = await db
          .select('*')
          .from('customers')
          .where('id', id)
          .first();

        expect(record).toEqual({
          id: '815a6749-5cf6-44e9-84e7-429bc008b3dc',
          name: 'Jasmine Hill',
          cards: '[]',
          version: 1,
        });
        expect(attempts).toBe(1);
      });

      it('should update an exisitng customer', async () => {
        let attempts = 0;
        const id = 'adcde8c4-6211-49ba-9e5a-5fd3d2b98957';

        await db
          .insert({
            id,
            name: 'Leslie Cunningham',
            cards: '[]',
            version: 1,
          })
          .into('customers');

        await uow.run(
          async (ctx) => {
            attempts++;

            const customerRepository = ctx.getRepository(CustomerRepository);

            const customer = await customerRepository.findById(id);

            if (!customer) {
              throw new Error('Customer not found');
            }

            customer.changeName('Billy Wagner');
          },
          { transaction },
        );

        const record = await db
          .select('*')
          .from('customers')
          .where('id', id)
          .first();

        expect(record).toEqual({
          id: 'adcde8c4-6211-49ba-9e5a-5fd3d2b98957',
          name: 'Billy Wagner',
          cards: '[]',
          version: 2,
        });
        expect(attempts).toBe(1);
      });

      it('should always return the same reference', async () => {
        const id = 'adcde8c4-6211-49ba-9e5a-5fd3d2b98957';

        await db
          .insert({
            id,
            name: 'Shaun Daniel',
            cards: '[]',
            version: 1,
          })
          .into('customers');

        await uow.run(
          async (ctx) => {
            const customerRepository = ctx.getRepository(CustomerRepository);

            const customer1 = await customerRepository.findById(id);
            const customer2 = await customerRepository.findById(id);

            expect(customer1).not.toBeUndefined();
            expect(customer1).toBe(customer2);
          },
          { transaction },
        );
      });

      it('should propagate an error', async () => {
        let attempts = 0;

        const action = () =>
          uow.run(
            () => {
              attempts++;
              throw new Error('Test error');
            },
            { transaction },
          );

        await expect(action).rejects.toThrowError('Test error');
        expect(attempts).toBe(1);
      });

      it('should propagate a result', async () => {
        const result = await uow.run(
          () => {
            return 'test result';
          },
          { transaction },
        );

        expect(result).toBe('test result');
      });
    },
  );

  describe('Concurrency in local transaction', () => {
    it.each([3, 7])(
      'should update an exisiting customer on %s attempt',
      async (attempts) => {
        const id = faker.string.uuid();
        const newName = faker.person.fullName();
        let attempt = 0;

        await db
          .insert({
            id,
            name: faker.person.fullName(),
            cards: '[]',
            version: 1,
          })
          .into('customers');

        const modify = () =>
          db.raw(
            `UPDATE customers SET version = version + 1 WHERE id = '${id}'`,
          );

        await uow.run(
          async (ctx) => {
            attempt++;

            const customer = await ctx
              .getRepository(CustomerRepository)
              .findById(id);

            customer?.changeName(newName);

            if (attempt < attempts) {
              await modify();
            }
          },
          { retries: attempts, transaction: { global: false } },
        );

        const record = await db
          .select('*')
          .from('customers')
          .where('id', id)
          .first();

        expect(record).toEqual({
          id,
          name: newName,
          cards: '[]',
          version: attempts + 1,
        });
        expect(attempt).toBe(attempts);
      },
    );

    it('should fail to update an exisiting customer because of a persistence error', async () => {
      let attempts = 0;
      const id = '71bf5067-891f-4d75-b727-5751a84446bc';

      await db
        .insert({
          id,
          name: 'Vivian Bridges',
          cards: '[]',
          version: 1,
        })
        .into('customers');

      const modify = () =>
        db.raw(`UPDATE customers SET version = version + 1 WHERE id = '${id}'`);

      const action = () =>
        uow.run(
          async (ctx) => {
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
          },
          { transaction: { global: false } },
        );

      await expect(action).rejects.toThrowError(RunError);

      const record = await db
        .select('*')
        .from('customers')
        .where('id', id)
        .first();

      expect(record).toEqual({
        id: '71bf5067-891f-4d75-b727-5751a84446bc',
        name: 'Vivian Bridges',
        cards: '[]',
        version: 4,
      });
      expect(attempts).toBe(3);
    });
  });
});
