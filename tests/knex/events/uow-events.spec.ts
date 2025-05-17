import { resolve } from 'path';
import { faker } from '@faker-js/faker';
import { knex } from 'knex';
import type { Knex } from 'knex';
import { KnexEngine } from '../../../src/knex';
import { Context, PersistenceError, Uow } from '../../../src/core';
import { Entity } from './utils/entity';
import { EntityRepository } from './utils/entity.schema';
import 'jest-extended';

describe('Knex – Uow Events', () => {
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

  afterEach(() => db.destroy());

  it('should not emit events if unsubscribed', async () => {
    // arrange
    const onBeforeRun = jest.fn();
    const onAfterRun = jest.fn();

    uow.on('beforeRun', onBeforeRun);
    uow.on('afterRun', onAfterRun);

    uow.off('beforeRun', onBeforeRun);
    uow.off('afterRun', onAfterRun);

    // act
    await uow.run((ctx) => {
      ctx.getRepository(EntityRepository).add(
        new Entity({
          id: faker.string.uuid(),
          name: faker.person.fullName(),
          cards: [
            faker.finance.creditCardNumber(),
            faker.finance.creditCardNumber(),
          ],
        }),
      );
    });

    // assert
    expect(onBeforeRun).not.toHaveBeenCalled();
    expect(onAfterRun).not.toHaveBeenCalled();
  });

  it('should emit events when unit successfuly run after 1 attempt', async () => {
    // arrange
    const onBeforeRun = jest.fn();
    const onAfterRun = jest.fn();

    uow.on('beforeRun', onBeforeRun);
    uow.on('afterRun', onAfterRun);

    // act
    await uow.run((ctx) => {
      ctx.getRepository(EntityRepository).add(
        new Entity({
          id: faker.string.uuid(),
          name: faker.person.fullName(),
          cards: [
            faker.finance.creditCardNumber(),
            faker.finance.creditCardNumber(),
          ],
        }),
      );
    });

    // assert
    expect(onBeforeRun).toHaveBeenCalledExactlyOnceWith({
      attempt: 1,
      context: expect.any(Context),
    });
    expect(onAfterRun).toHaveBeenCalledExactlyOnceWith({
      attempt: 1,
      context: expect.any(Context),
      error: undefined,
    });
  });

  it('should emit events when unit successfuly run after 3 attempts', async () => {
    // arrange
    let attempt = 0;
    const id = faker.string.uuid();
    await uow.run((ctx) =>
      ctx.getRepository(EntityRepository).add(
        new Entity({
          id,
          name: faker.person.fullName(),
          cards: [
            faker.finance.creditCardNumber(),
            faker.finance.creditCardNumber(),
          ],
        }),
      ),
    );

    const onBeforeRun = jest.fn();
    const onAfterRun = jest.fn();

    uow.on('beforeRun', onBeforeRun);
    uow.on('afterRun', onAfterRun);

    // act
    await uow.run(async (ctx) => {
      const entity = await ctx
        .getRepository(EntityRepository)
        .find((qb) => qb.where('id', id));

      if (++attempt < 3) {
        await db('entity')
          .update({ version: db.raw('version + 1') })
          .where('id', id);
      }

      entity?.changeName(faker.person.fullName());
    });

    // assert
    expect(onBeforeRun).toHaveBeenCalledTimes(3);
    expect(onBeforeRun).toHaveBeenNthCalledWith(1, {
      attempt: 1,
      context: expect.any(Context),
    });
    expect(onBeforeRun).toHaveBeenNthCalledWith(2, {
      attempt: 2,
      context: expect.any(Context),
    });
    expect(onBeforeRun).toHaveBeenNthCalledWith(3, {
      attempt: 3,
      context: expect.any(Context),
    });
    expect(onAfterRun).toHaveBeenCalledTimes(3);
    expect(onAfterRun).toHaveBeenNthCalledWith(1, {
      attempt: 1,
      context: expect.any(Context),
      error: expect.any(PersistenceError),
    });
    expect(onAfterRun).toHaveBeenNthCalledWith(2, {
      attempt: 2,
      context: expect.any(Context),
      error: expect.any(PersistenceError),
    });
    expect(onAfterRun).toHaveBeenNthCalledWith(3, {
      attempt: 3,
      context: expect.any(Context),
      error: undefined,
    });
  });
});
