import { resolve } from 'path';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { knex } from 'knex';
import type { Knex } from 'knex';
import { KnexEngine } from '../../src/knex';
import { Uow } from '../../src/core';
import { EntityRepository } from './utils/entity.schema';
import { Entity } from './utils/entity';

describe('Knex – Find Existing Entity', () => {
  let db: Knex;
  let uow: Uow<KnexEngine>;

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
        const result = await uow.run(
          (ctx) =>
            ctx
              .getRepository(EntityRepository)
              .find((queryBuilder) => queryBuilder.where('id', id)),
          { transaction },
        );

        // assert
        expect(result).toBeInstanceOf(Entity);
        expect(result?.id).toBe(id);
        expect(result?.name).toBe(name);
      });

      it("should fail to find entity if it doesn't exist", async () => {
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
        const result = await uow.run(
          (ctx) =>
            ctx
              .getRepository(EntityRepository)
              .find((queryBuilder) =>
                queryBuilder.where('id', crypto.randomUUID()),
              ),
          { transaction },
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
              id: faker.string.uuid(),
              name: faker.person.fullName(),
              cards: [],
            }),
          ),
        );

        await uow.run(
          async (ctx) => {
            const entityRepository = ctx.getRepository(EntityRepository);

            const entity1 = await entityRepository.find((qb) =>
              qb.where('id', id),
            );
            const entity2 = await entityRepository.find((qb) =>
              qb.where('id', id),
            );

            expect(entity1).toBe(entity2);
          },
          { transaction },
        );
      });
    },
  );
});
