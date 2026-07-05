import { Context, RunError, Transactional, UowContext } from '../../src/core';
import { Entity } from '../.config/entities/entity';
import { createKnexHarness, createPrismaHarness } from '../.config/harness';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, it, expect, afterEach } from 'vitest';

describe.each([
  ['knex', createKnexHarness],
  ['prisma', createPrismaHarness],
])('Update Entity (%s)', (_name, createHarness) => {
  let harness: Awaited<ReturnType<typeof createHarness>>;

  const createEntity = async () => {
    const entity = Entity.generate();
    await harness.uow.run((ctx) => harness.getRepository(ctx).add(entity));

    return entity;
  };

  beforeEach(async () => {
    harness = await createHarness();
  });

  afterEach(() => harness.teardown());

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

      it('should update an existing entity', async () => {
        // arrange
        const { id, cards } = await createEntity();
        const newName = faker.person.fullName();

        // act
        await UowContext.create(harness.uow, () =>
          testService.test(async () => {
            const entity = (await harness.find(
              harness.getRepository(Context),
              id,
            ))!;

            entity.name = newName;
          }),
        );

        // assert
        const entity = await harness.uow.run((ctx) =>
          harness.find(harness.getRepository(ctx), id),
        );
        expect(entity).toBeInstanceOf(Entity);
        expect(entity?.id).toBe(id);
        expect(entity?.name).toBe(newName);
        expect(entity?.cards).toEqual(cards);
      });
    },
  );

  describe('High Concurrency', () => {
    it.each([1, 5, 10])(
      'should fail to update an exisiting entity after %s attempts',
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
                entity.name = faker.person.fullName();
              }

              if (attempt <= attempts) {
                await harness.bumpVersion(id);
              }
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
      'should update an exisiting entity on %s attempt',
      async (attempts) => {
        // arrange
        let attempt = 0;
        const { id, cards } = await createEntity();
        const newName = faker.person.fullName();

        // act
        await harness.uow.run(
          async (ctx) => {
            attempt++;

            const entity = await harness.find(harness.getRepository(ctx), id);

            if (entity) {
              entity.name = newName;
            }

            if (attempt < attempts) {
              await harness.bumpVersion(id);
            }
          },
          { attempts, transaction: { global: false } },
        );

        // assert
        const record = await harness.readRecord(id);
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
