import { resolve } from 'path';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { knex } from 'knex';
import type { Knex } from 'knex';
import { KnexEngine } from '../../src/knex';
import { RunError, Uow } from '../../src/core';
import { EntityRepository } from './utils/entity.schema';
import { Entity } from './utils/entity';

describe('Knex – Delete Existing Entity', () => {
  let db: Knex;
  let uow: Uow<KnexEngine>;

  const createEntity = async () => {
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    const cards = [faker.finance.accountNumber()];
    await uow.run((ctx) =>
      ctx.getRepository(EntityRepository).add(new Entity({ id, name, cards })),
    );

    return { id, name, cards };
  };

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
      migrations: {
        directory: resolve(__dirname, 'utils/migrations'),
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
      it('should delete an existing entity', async () => {
        // arrange
        const { id } = await createEntity();

        // act
        await uow.run(
          async (ctx) => {
            const customerRepository = ctx.getRepository(EntityRepository);

            const customer = await customerRepository.find((queryBuilder) =>
              queryBuilder.where('id', id),
            );

            if (!customer) {
              throw new Error('Customer not found');
            }

            customerRepository.delete(customer);
          },
          { transaction },
        );

        // assert
        const entity = await uow.run((ctx) =>
          ctx.getRepository(EntityRepository).find((qb) => qb.where('id', id)),
        );

        expect(entity).toBeUndefined();
      });
    },
  );

  describe('High Concurrency', () => {
    const concurrentlyUpdate = (id: string) =>
      db.raw(`UPDATE entity SET version = version + 1 WHERE id = '${id}'`);

    it.each([3, 7, 15])(
      'should fail to delete an exisiting entity after %s attempts',
      async (attempts) => {
        let attempt = 0;
        const { id, name, cards } = await createEntity();

        const action = () =>
          uow.run(
            async (ctx) => {
              attempt++;

              const entity = await ctx
                .getRepository(EntityRepository)
                .find((qb) => qb.where('id', id));

              if (entity) {
                ctx.getRepository(EntityRepository).delete(entity);
              }

              if (attempt <= attempts) {
                await concurrentlyUpdate(id);
              }
            },
            { attempts, transaction: { global: false } },
          );

        await expect(action).rejects.toThrow(RunError);

        const record = await db
          .select('*')
          .from('entity')
          .where('id', id)
          .first();

        expect(record).toEqual({
          id,
          name,
          cards: JSON.stringify(cards),
          version: attempt + 1,
        });
        expect(attempt).toBe(attempts);
      },
    );

    it.each([3, 7])(
      'should update an exisiting customer on %s attempt',
      async (attempts) => {
        let attempt = 0;
        const { id } = await createEntity();

        await uow.run(
          async (ctx) => {
            attempt++;

            const entity = await ctx
              .getRepository(EntityRepository)
              .find((qb) => qb.where('id', id));

            if (entity) {
              ctx.getRepository(EntityRepository).delete(entity);
            }

            if (attempt < attempts) {
              await concurrentlyUpdate(id);
            }
          },
          { attempts, transaction: { global: false } },
        );

        const record = await db
          .select('*')
          .from('entity')
          .where('id', id)
          .first();

        expect(record).toBe(undefined);
        expect(attempt).toBe(attempts);
      },
    );
  });
});
