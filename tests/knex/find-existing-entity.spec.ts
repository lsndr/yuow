import { resolve } from 'path';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { knex } from 'knex';
import type { Knex } from 'knex';
import type { KnexTransaction, KnexTransactionOptions } from '../../src/knex';
import { KnexEngine } from '../../src/knex';
import { Uow } from '../../src/core';
import { EntityRepository } from './utils/entity.schema';
import { Entity } from './utils/entity';

describe('Knex – Find Existing Entity', () => {
  let db: Knex;
  let uow: Uow<KnexEngine, KnexTransaction, KnexTransactionOptions>;

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

  it('should find existing entity', async () => {
    // arrange
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    await uow.run((ctx) =>
      ctx
        .getRepository(EntityRepository)
        .add(Entity.create({ id, name, cards: [] })),
    );

    // act
    const result = await uow.run((ctx) =>
      ctx
        .getRepository(EntityRepository)
        .find((queryBuilder) => queryBuilder.where('id', id)),
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
        Entity.create({
          id: faker.string.uuid(),
          name: faker.person.fullName(),
          cards: [],
        }),
      ),
    );

    // act
    const result = await uow.run((ctx) =>
      ctx
        .getRepository(EntityRepository)
        .find((queryBuilder) => queryBuilder.where('id', crypto.randomUUID())),
    );

    // assert
    expect(result).toBeUndefined();
  });
});
