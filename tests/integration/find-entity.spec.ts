import { Context, Transactional, UowContext } from '../../src/core';
import { Entity } from '../.config/entities/entity';
import { createKnexHarness, createPrismaHarness } from '../.config/harness';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, it, expect, afterEach } from 'vitest';

describe.each([
  ['knex', createKnexHarness],
  ['prisma', createPrismaHarness],
])('Find Entity (%s)', (_name, createHarness) => {
  let harness: Awaited<ReturnType<typeof createHarness>>;

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

      it('should find existing entity', async () => {
        // arrange
        const id = faker.string.uuid();
        const name = faker.person.fullName();
        await harness.uow.run((ctx) =>
          harness.getRepository(ctx).add(new Entity({ id, name, cards: [] })),
        );

        // act
        const result = await UowContext.create(harness.uow, () =>
          testService.test(() =>
            harness.find(harness.getRepository(Context), id),
          ),
        );

        // assert
        expect(result).toBeInstanceOf(Entity);
        expect(result?.id).toBe(id);
        expect(result?.name).toBe(name);
      });

      it("should not find entity if it doesn't exist", async () => {
        // arrange
        await harness.uow.run((ctx) =>
          harness.getRepository(ctx).add(
            new Entity({
              id: faker.string.uuid(),
              name: faker.person.fullName(),
              cards: [],
            }),
          ),
        );

        // act
        const result = await UowContext.create(harness.uow, () =>
          testService.test(() =>
            harness.find(harness.getRepository(Context), crypto.randomUUID()),
          ),
        );

        // assert
        expect(result).toBeUndefined();
      });

      it('should find same reference', async () => {
        // arrange
        const id = faker.string.uuid();
        await harness.uow.run((ctx) =>
          harness.getRepository(ctx).add(
            new Entity({
              id,
              name: faker.person.fullName(),
              cards: [],
            }),
          ),
        );

        // act
        const [entity1, entity2] = await UowContext.create(harness.uow, () =>
          testService.test(async () => {
            const entityRepository = harness.getRepository(Context);

            const entity1 = await harness.find(entityRepository, id);
            const entity2 = await harness.find(entityRepository, id);

            return [entity1, entity2] as const;
          }),
        );

        expect(entity1).toBeInstanceOf(Entity);
        expect(entity1).toBe(entity2);
      });
    },
  );
});
