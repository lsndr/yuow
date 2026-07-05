import { Context, RunError, Transactional, UowContext } from '../../src/core';
import { Entity } from '../.config/entities/entity';
import { createKnexHarness, createPrismaHarness } from '../.config/harness';
import { beforeEach, describe, it, expect, afterEach } from 'vitest';

describe.each([
  ['knex', createKnexHarness],
  ['prisma', createPrismaHarness],
])('Delete Entity (%s)', (_name, createHarness) => {
  let harness: Awaited<ReturnType<typeof createHarness>>;

  const createEntity = async () => {
    const entity = Entity.generate();
    await harness.uow.run((ctx) => harness.getRepository(ctx).add(entity));

    return entity;
  };

  beforeEach(async () => {
    harness = await createHarness();
  });

  afterEach(async () => {
    await harness.teardown();
  });

  describe.each([{ global: true }, { global: false }])(
    'Transaction Config: %j',
    (transaction) => {
      let testService: TestService;

      class TestService {
        @Transactional({ transaction })
        public test<R>(unit: () => R): R {
          return unit();
        }
      }

      beforeEach(() => {
        testService = new TestService();
      });

      it('should delete an existing entity', async () => {
        // arrange
        const { id } = await createEntity();

        // act
        await UowContext.create(harness.uow, () =>
          testService.test(async () => {
            const entityRepository = harness.getRepository(Context);
            const entity = (await harness.find(entityRepository, id))!;

            entityRepository.delete(entity);
          }),
        );

        // assert
        const entity = await harness.uow.run((ctx) =>
          harness.find(harness.getRepository(ctx), id),
        );
        expect(entity).toBeUndefined();
      });
    },
  );

  describe('High Concurrency', () => {
    it.each([3, 7, 15])(
      'should fail to delete an exisiting entity after %s attempts',
      async (attempts) => {
        // arrange
        let attempt = 0;
        const { id, name, cards } = await createEntity();

        // act
        const action = () =>
          harness.uow.run(
            async (ctx) => {
              attempt++;

              const entity = await harness.find(harness.getRepository(ctx), id);

              if (entity) {
                harness.getRepository(ctx).delete(entity);
              }

              // simulate concurrent update
              await harness.bumpVersion(id);
            },
            { attempts, transaction: { global: false } },
          );

        // assert
        await expect(action).rejects.toThrow(RunError);
        const record = await harness.readRecord(id);
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
      'should delete an exisiting entity on %s attempt',
      async (attempts) => {
        // arrange
        let attempt = 0;
        const { id } = await createEntity();

        // act
        await harness.uow.run(
          async (ctx) => {
            attempt++;

            const entity = await harness.find(harness.getRepository(ctx), id);

            if (entity) {
              harness.getRepository(ctx).delete(entity);
            }

            // simulate concurrent update
            if (attempt < attempts) {
              await harness.bumpVersion(id);
            }
          },
          { attempts, transaction: { global: false } },
        );

        // assert
        const record = await harness.readRecord(id);
        expect(record).toBe(undefined);
        expect(attempt).toBe(attempts);
      },
    );
  });
});
