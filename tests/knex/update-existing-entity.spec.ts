import { resolve } from 'path';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { type Knex, knex } from 'knex';
import {
  KnexEngine,
  type KnexTransaction,
  type KnexTransactionOptions,
} from '../../src/knex';
import { Uow } from '../../src/core';
import { EntityRepository } from './utils/entity.schema';
import { Entity } from './utils/entity';

describe('Knex – Update Existing Entity', () => {
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

  it('should update an existing entity', async () => {
    // arrange
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    const newName = faker.person.fullName();
    await uow.run((ctx) =>
      ctx
        .getRepository(EntityRepository)
        .add(Entity.create({ id, name, cards: [] })),
    );

    // act
    await uow.run(async (ctx) => {
      const customer = await ctx
        .getRepository(EntityRepository)
        .find((qb) => qb.where('id', id));

      customer?.changeName(newName);
    });

    // assert
    const entity = await uow.run((ctx) =>
      ctx.getRepository(EntityRepository).find((qb) => qb.where('id', id)),
    );

    expect(entity).toBeInstanceOf(Entity);
    expect(entity?.id).toBe(id);
    expect(entity?.name).toBe(newName);
  });
});
