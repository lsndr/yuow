import { resolve } from 'path';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { type Knex, knex } from 'knex';
import { KnexEngine } from '../../src/knex';
import { RunError, Uow } from '../../src/core';
import { EntityRepository } from './utils/entity.schema';
import { Entity } from './utils/entity';

describe('Knex – Update Existing Entity', () => {
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
      it('should update an existing entity', async () => {
        // arrange
        const { id, cards } = await createEntity();
        const newName = faker.person.fullName();

        // act
        await uow.run(
          async (ctx) => {
            const customer = await ctx
              .getRepository(EntityRepository)
              .find((qb) => qb.where('id', id));

            customer?.changeName(newName);
          },
          { transaction },
        );

        // assert
        const entity = await uow.run((ctx) =>
          ctx.getRepository(EntityRepository).find((qb) => qb.where('id', id)),
        );

        expect(entity).toBeInstanceOf(Entity);
        expect(entity?.id).toBe(id);
        expect(entity?.name).toBe(newName);
        expect(entity?.cards).toEqual(cards);
      });
    },
  );

  describe('High Concurrency', () => {
    const concurrentlyUpdate = (id: string) =>
      db.raw(`UPDATE entity SET version = version + 1 WHERE id = '${id}'`);

    it.each([1, 5, 10])(
      'should fail to update an exisiting entity after %s attempts',
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

              entity?.changeName(faker.person.fullName());

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
        const { id, cards } = await createEntity();
        const newName = faker.person.fullName();

        await uow.run(
          async (ctx) => {
            attempt++;

            const entity = await ctx
              .getRepository(EntityRepository)
              .find((qb) => qb.where('id', id));

            entity?.changeName(newName);

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

        expect(record).toEqual({
          id,
          name: newName,
          cards: JSON.stringify(cards),
          version: attempts + 1,
        });
        expect(attempt).toBe(attempts);
      },
    );
  });
});
