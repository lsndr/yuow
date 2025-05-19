import { resolve } from 'path';
import { faker } from '@faker-js/faker';
import { knex } from 'knex';
import type { Knex } from 'knex';
import { KnexEngine } from '../../src/knex';
import { Uow } from '../../src/core';
import { Entity } from './utils/entity';
import { EntityRepository } from './utils/entity.schema';

describe('Knex – Create New Entity', () => {
  let db: Knex;
  let uow: Uow<KnexEngine>;

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
      migrations: {
        directory: resolve(__dirname, './utils/migrations'),
      },
    });

    uow = new Uow(new KnexEngine(db));

    await db.migrate.latest();
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe.each([{ global: true }, { global: false }])(
    'Transaction Config: %j',
    (transaction) => {
      it('should persist a new entity', async () => {
        // arrange
        const id = faker.string.uuid();
        const name = faker.person.fullName();
        const cards = [
          faker.finance.creditCardNumber(),
          faker.finance.creditCardNumber(),
        ];

        // act
        await uow.run(
          (ctx) => {
            ctx
              .getRepository(EntityRepository)
              .add(new Entity({ id, name, cards }));
          },
          { transaction },
        );

        // assert
        const entity = await uow.run((ctx) =>
          ctx.getRepository(EntityRepository).find((qb) => qb.where('id', id)),
        );

        expect(entity).toBeInstanceOf(Entity);
        expect(entity?.id).toBe(id);
        expect(entity?.name).toBe(name);
        expect(entity?.cards).toEqual(cards);
      });

      it('should persist a new entity only once', async () => {
        const id = faker.string.uuid();
        const name = faker.person.fullName();
        const cards = [
          faker.finance.creditCardNumber(),
          faker.finance.creditCardNumber(),
        ];

        await uow.run(
          (ctx) => {
            const entityRepository = ctx.getRepository(EntityRepository);

            const entity = new Entity({ id, name, cards });

            entityRepository.add(entity);
            entityRepository.add(entity);
          },
          { transaction },
        );

        const record = await db
          .select('*')
          .from('entity')
          .where('id', id)
          .first();

        expect(record).toEqual({
          id,
          name,
          cards: JSON.stringify(cards),
          version: 1,
        });
      });
    },
  );
});
