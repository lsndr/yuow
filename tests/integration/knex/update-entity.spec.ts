import { RunError, Uow } from '../../../src/core';
import {
  type EntityRepositoryConstructor,
  KnexEngine,
  type Schema,
} from '../../../src/knex';
import { Entity } from '../../utils/entities/entity';
import { createEntitySchema } from '../../utils/entities/entity.schema';
import { createKnexConnection } from '../../utils/knex/connection';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { type Knex } from 'knex';

describe('Update Entity', () => {
  let db: Knex;
  let uow: Uow<KnexEngine>;
  let schema: Schema<Entity>;
  let EntityRepository: EntityRepositoryConstructor<Entity>;

  const createEntity = async () => {
    const entity = Entity.generate();
    await uow.run((ctx) => ctx.getRepository(EntityRepository).add(entity));

    return entity;
  };

  beforeEach(async () => {
    const entity = createEntitySchema();

    db = await createKnexConnection(entity.migration);
    uow = new Uow(new KnexEngine(db));
    schema = entity.schema;
    EntityRepository = entity.schema.createRepository();
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
            const entity = await ctx
              .getRepository(EntityRepository)
              .find((qb) => qb.where('id', id));

            if (entity) {
              entity.name = newName;
            }
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
      db.raw(
        `UPDATE "${schema.options.table}" SET version = version + 1 WHERE id = '${id}'`,
      );

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

              if (entity) {
                entity.name = faker.person.fullName();
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
          .from(schema.options.table)
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
      'should update an exisiting entity on %s attempt',
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

            if (entity) {
              entity.name = newName;
            }

            if (attempt < attempts) {
              await concurrentlyUpdate(id);
            }
          },
          { attempts, transaction: { global: false } },
        );

        const record = await db
          .select('*')
          .from(schema.options.table)
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
