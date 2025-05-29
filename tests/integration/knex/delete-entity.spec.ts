import { RunError, Uow } from '../../../src/core';
import {
  type EntityRepositoryConstructor,
  KnexEngine,
  type Schema,
} from '../../../src/knex';
import { Entity } from '../../utils/entities/entity';
import { createEntitySchema } from '../../utils/entities/entity.schema';
import { createKnexConnection } from '../../utils/knex/connection';
import type { Knex } from 'knex';

describe('Delete Entity', () => {
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
      it('should delete an existing entity', async () => {
        // arrange
        const { id } = await createEntity();

        // act
        await uow.run(
          async (ctx) => {
            const entityRepository = ctx.getRepository(EntityRepository);

            const entity = await entityRepository.find((queryBuilder) =>
              queryBuilder.where('id', id),
            );

            if (!entity) {
              throw new Error('Entity not found');
            }

            entityRepository.delete(entity);
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
      db.raw(
        `UPDATE "${schema.options.table}" SET version = version + 1 WHERE id = '${id}'`,
      );

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
          .from(schema.options.table)
          .where('id', id)
          .first();

        expect(record).toBe(undefined);
        expect(attempt).toBe(attempts);
      },
    );
  });
});
