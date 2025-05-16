import { resolve } from 'path';
import { faker } from '@faker-js/faker/locale/yo_NG';
import { knex } from 'knex';
import type { Knex } from 'knex';
import { KnexEngine } from '../../src/knex';
import { Uow } from '../../src/core';
import { EntityRepository } from './utils/entity.schema';
import { Entity } from './utils/entity';

describe('Knex – Delete Existing Entity', () => {
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

  it('should delete an existing entity', async () => {
    // arrange
    const id = faker.string.uuid();
    await uow.run((ctx) =>
      ctx
        .getRepository(EntityRepository)
        .add(Entity.create({ id, name: faker.person.fullName(), cards: [] })),
    );

    // act
    await uow.run(async (ctx) => {
      const customerRepository = ctx.getRepository(EntityRepository);

      const customer = await customerRepository.find((queryBuilder) =>
        queryBuilder.where('id', id),
      );

      if (!customer) {
        throw new Error('Customer not found');
      }

      customerRepository.delete(customer);
    });

    // assert
    const entity = await uow.run((ctx) =>
      ctx.getRepository(EntityRepository).find((qb) => qb.where('id', id)),
    );

    expect(entity).toBeUndefined();
  });
});
