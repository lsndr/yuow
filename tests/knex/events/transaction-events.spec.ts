import { resolve } from 'path';
import { faker } from '@faker-js/faker';
import { knex } from 'knex';
import type { Knex } from 'knex';
import { KnexEngine } from '../../../src/knex';
import { RunError, Uow } from '../../../src/core';
import { Entity } from './utils/entity';
import { EntityRepository } from './utils/entity.schema';
import 'jest-extended';

describe('Knex – Transaction Events', () => {
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
    const onBeforeBegin = jest.fn();

    // act

    await uow.run((ctx) => {
      ctx.transaction.on('beforeBegin', onBeforeBegin);
      ctx.transaction.off('beforeBegin', onBeforeBegin);

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
    expect(onBeforeBegin).not.toHaveBeenCalled();
  });

  it('should emit events when persisting entity', async () => {
    // arrange
    const onBeforeBegin = jest.fn();
    const onAfterBegin = jest.fn();

    const onBeforeCommit = jest.fn();
    const onAfterCommit = jest.fn();

    const onBeforeRollback = jest.fn();
    const onAfterRollback = jest.fn();

    // act
    await uow.run((ctx) => {
      ctx.transaction.on('beforeBegin', onBeforeBegin);
      ctx.transaction.on('afterBegin', onAfterBegin);

      ctx.transaction.on('beforeCommit', onBeforeCommit);
      ctx.transaction.on('afterCommit', onAfterCommit);

      ctx.transaction.on('beforeRollback', onBeforeRollback);
      ctx.transaction.on('afterRollback', onAfterRollback);

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
    expect(onBeforeBegin).toHaveBeenCalledOnce();
    expect(onAfterBegin).toHaveBeenCalledOnce();
    expect(onBeforeCommit).toHaveBeenCalledOnce();
    expect(onAfterCommit).toHaveBeenCalledOnce();
    expect(onBeforeRollback).not.toHaveBeenCalled();
    expect(onAfterRollback).not.toHaveBeenCalled();

    expect(onBeforeBegin).toHaveBeenCalledBefore(onAfterBegin);
    expect(onAfterBegin).toHaveBeenCalledBefore(onBeforeCommit);
    expect(onBeforeCommit).toHaveBeenCalledBefore(onAfterCommit);
  });

  it('should emit events when persistence failed', async () => {
    // arrange
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

    const onBeforeBegin = jest.fn();
    const onAfterBegin = jest.fn();

    const onBeforeCommit = jest.fn();
    const onAfterCommit = jest.fn();

    const onBeforeRollback = jest.fn();
    const onAfterRollback = jest.fn();

    // act
    const act = () =>
      uow.run(
        async (ctx) => {
          ctx.transaction.on('beforeBegin', onBeforeBegin);
          ctx.transaction.on('afterBegin', onAfterBegin);

          ctx.transaction.on('beforeCommit', onBeforeCommit);
          ctx.transaction.on('afterCommit', onAfterCommit);

          ctx.transaction.on('beforeRollback', onBeforeRollback);
          ctx.transaction.on('afterRollback', onAfterRollback);

          const entity = await ctx
            .getRepository(EntityRepository)
            .find((qb) => qb.where('id', id));

          entity?.changeName(faker.person.fullName());

          await db('entity')
            .update({ version: db.raw('version + 1') })
            .where('id', id);
        },
        {
          attempts: 1,
        },
      );

    // assert
    await expect(act).rejects.toThrow(new RunError([]));

    expect(onBeforeBegin).toHaveBeenCalledOnce();
    expect(onAfterBegin).toHaveBeenCalledOnce();
    expect(onBeforeCommit).not.toHaveBeenCalledOnce();
    expect(onAfterCommit).not.toHaveBeenCalledOnce();
    expect(onBeforeRollback).toHaveBeenCalled();
    expect(onAfterRollback).toHaveBeenCalled();

    expect(onBeforeBegin).toHaveBeenCalledBefore(onAfterBegin);
    expect(onAfterBegin).toHaveBeenCalledBefore(onBeforeRollback);
    expect(onBeforeRollback).toHaveBeenCalledBefore(onAfterRollback);
  });

  it('should not emit events when unit failed', async () => {
    // arrange
    const onBeforeBegin = jest.fn();
    const onAfterBegin = jest.fn();

    const onBeforeCommit = jest.fn();
    const onAfterCommit = jest.fn();

    const onBeforeRollback = jest.fn();
    const onAfterRollback = jest.fn();

    // act
    const act = () =>
      uow.run((ctx) => {
        ctx.transaction.on('beforeBegin', onBeforeBegin);
        ctx.transaction.on('afterBegin', onAfterBegin);
        ctx.transaction.on('beforeCommit', onBeforeCommit);
        ctx.transaction.on('afterCommit', onAfterCommit);
        ctx.transaction.on('beforeRollback', onBeforeRollback);
        ctx.transaction.on('afterRollback', onAfterRollback);

        throw new Error('Unit failed');
      });

    // assert
    await expect(act).rejects.toThrow(new Error('Unit failed'));

    expect(onBeforeBegin).not.toHaveBeenCalled();
    expect(onAfterBegin).not.toHaveBeenCalled();
    expect(onBeforeCommit).not.toHaveBeenCalled();
    expect(onAfterCommit).not.toHaveBeenCalled();
    expect(onBeforeRollback).not.toHaveBeenCalled();
    expect(onAfterRollback).not.toHaveBeenCalled();
  });
});
