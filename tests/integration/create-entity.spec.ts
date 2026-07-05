import { Context, Transactional, UowContext } from '../../src/core';
import { Entity } from '../.config/entities/entity';
import { createKnexHarness, createPrismaHarness } from '../.config/harness';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, it, expect, afterEach } from 'vitest';

describe.each([
  ['knex', createKnexHarness],
  ['prisma', createPrismaHarness],
])('Create Entity (%s)', (_name, createHarness) => {
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
        public test(unit: () => void) {
          unit();
        }
      }

      beforeEach(async () => {
        harness = await createHarness();
        testService = new TestService();
      });

      it('should persist a new entity', async () => {
        // arrange
        const id = faker.string.uuid();
        const name = faker.person.fullName();
        const cards = [
          faker.finance.creditCardNumber(),
          faker.finance.creditCardNumber(),
        ];

        // act
        await UowContext.create(harness.uow, () =>
          testService.test(() => {
            harness.getRepository(Context).add(new Entity({ id, name, cards }));
          }),
        );

        // assert
        const entity = await harness.uow.run((ctx) =>
          harness.find(harness.getRepository(ctx), id),
        );

        expect(entity).toBeInstanceOf(Entity);
        expect(entity?.id).toBe(id);
        expect(entity?.name).toBe(name);
        expect(entity?.cards).toEqual(cards);
      });
    },
  );
});
