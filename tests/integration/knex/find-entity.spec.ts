import { Context, Transactional, Uow, UowContext } from '../../../src/core';
import {
  type EntityRepositoryConstructor,
  KnexEngine,
} from '../../../src/knex';
import { Entity } from '../../utils/entities/entity';
import { createEntitySchema } from '../../utils/entities/entity.schema';
import { createKnexConnection } from '../../utils/knex/connection';
import { faker } from '@faker-js/faker/locale/yo_NG';
import type { Knex } from 'knex';

describe('Find Entity', () => {
  let db: Knex;
  let uow: Uow<KnexEngine>;
  let EntityRepository: EntityRepositoryConstructor<Entity>;

  beforeEach(async () => {
    const entity = createEntitySchema();

    db = await createKnexConnection(entity.migration);
    uow = new Uow(new KnexEngine(db));
    EntityRepository = entity.schema.createRepository();
  });

  afterEach(async () => {
    await db.destroy();
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
        await uow.run((ctx) =>
          ctx
            .getRepository(EntityRepository)
            .add(new Entity({ id, name, cards: [] })),
        );

        // act
        const result = await UowContext.create(uow, () =>
          testService.test(() =>
            Context.getRepository(EntityRepository).find((queryBuilder) =>
              queryBuilder.where('id', id),
            ),
          ),
        );

        // assert
        expect(result).toBeInstanceOf(Entity);
        expect(result?.id).toBe(id);
        expect(result?.name).toBe(name);
      });

      it("should not find entity if it doesn't exist", async () => {
        // arrange
        await uow.run((ctx) =>
          ctx.getRepository(EntityRepository).add(
            new Entity({
              id: faker.string.uuid(),
              name: faker.person.fullName(),
              cards: [],
            }),
          ),
        );

        // act
        const result = await UowContext.create(uow, () =>
          testService.test(() =>
            Context.getRepository(EntityRepository).find((queryBuilder) =>
              queryBuilder.where('id', crypto.randomUUID()),
            ),
          ),
        );

        // assert
        expect(result).toBeUndefined();
      });

      it('should find same reference', async () => {
        // arrange
        const id = faker.string.uuid();
        await uow.run((ctx) =>
          ctx.getRepository(EntityRepository).add(
            new Entity({
              id,
              name: faker.person.fullName(),
              cards: [],
            }),
          ),
        );

        // act
        const [entity1, entity2] = await UowContext.create(uow, () =>
          testService.test(async () => {
            const entityRepository = Context.getRepository(EntityRepository);

            const entity1 = await entityRepository.find((qb) =>
              qb.where('id', id),
            );
            const entity2 = await entityRepository.find((qb) =>
              qb.where('id', id),
            );

            return [entity1, entity2] as const;
          }),
        );

        expect(entity1).toBeInstanceOf(Entity);
        expect(entity1).toBe(entity2);
      });
    },
  );
});
