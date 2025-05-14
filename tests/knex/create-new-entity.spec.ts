import { resolve } from 'path';
import { faker } from '@faker-js/faker';
import { knex } from 'knex';
import type { Knex } from 'knex';
import type { KnexTransaction, KnexTransactionOptions } from '../../src/knex';
import { KnexEngine } from '../../src/knex';
import { Uow } from '../../src/core';
import { Entity } from './utils/entity';
import { EntityRepository } from './utils/entity.schema';

describe('Knex – Create New Entity', () => {
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

  it('should persist a new entity', async () => {
    // arrange
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    const cards = [
      faker.finance.creditCardNumber(),
      faker.finance.creditCardNumber(),
    ];

    // act
    await uow.run((ctx) => {
      ctx
        .getRepository(EntityRepository)
        .add(Entity.create({ id, name, cards }));
    });

    // assert
    const entity = await uow.run((ctx) =>
      ctx.getRepository(EntityRepository).find((qb) => qb.where('id', id)),
    );

    expect(entity).toBeInstanceOf(Entity);
    expect(entity?.id).toBe(id);
    expect(entity?.name).toBe(name);
    expect(entity?.cards).toEqual(cards);
  });
});
