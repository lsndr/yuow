import { resolve } from 'path';
import { faker } from '@faker-js/faker';
import { knex } from 'knex';
import type { Knex } from 'knex';
import { KnexEngine } from '../../src/knex';
import { Uow } from '../../src/core';
import { Entity } from './utils/entity';
import { EntityRepository } from './utils/entity.schema';
import 'jest-extended';

describe('Knex – Transaction Lifecycle Events', () => {
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

    await db.migrate.latest();
  });

  afterEach(() => db.destroy());

  it('should not emit transaction lifecycle event if unsubscribed', async () => {
    // arrange
    const onBeforeFlush = jest.fn();

    // act
    await uow.run((ctx) => {
      ctx.transaction.on('beforeFlush', onBeforeFlush);
      ctx.transaction.off('beforeFlush', onBeforeFlush);

      ctx.getRepository(EntityRepository).add(
        Entity.create({
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
    expect(onBeforeFlush).not.toHaveBeenCalled();
  });

  it('should emit transaction lifecycle events when persisting entity', async () => {
    // arrange
    const onBeforeFlush = jest.fn();
    const onFlush = jest.fn();
    const onAfterFlush = jest.fn();

    const onBeforeCommit = jest.fn();
    const onCommit = jest.fn();
    const onAfterCommit = jest.fn();

    const onBeforeRollback = jest.fn();
    const onRollback = jest.fn();
    const onAfterRollback = jest.fn();

    // act
    await uow.run((ctx) => {
      ctx.transaction.on('beforeFlush', onBeforeFlush);
      ctx.transaction.on('flush', onFlush);
      ctx.transaction.on('afterFlush', onAfterFlush);
      ctx.transaction.on('beforeCommit', onBeforeCommit);
      ctx.transaction.on('commit', onCommit);
      ctx.transaction.on('afterCommit', onAfterCommit);
      ctx.transaction.on('beforeRollback', onBeforeRollback);
      ctx.transaction.on('rollback', onRollback);
      ctx.transaction.on('afterRollback', onAfterRollback);

      ctx.getRepository(EntityRepository).add(
        Entity.create({
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
    expect(onBeforeFlush).toHaveBeenCalledOnce();
    expect(onFlush).toHaveBeenCalledOnce();
    expect(onAfterFlush).toHaveBeenCalledOnce();
    expect(onBeforeCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onAfterCommit).toHaveBeenCalledOnce();
    expect(onBeforeRollback).not.toHaveBeenCalled();
    expect(onRollback).not.toHaveBeenCalled();
    expect(onAfterRollback).not.toHaveBeenCalled();

    expect(onBeforeFlush).toHaveBeenCalledBefore(onFlush);
    expect(onFlush).toHaveBeenCalledBefore(onAfterFlush);
    expect(onAfterFlush).toHaveBeenCalledBefore(onBeforeCommit);
    expect(onBeforeCommit).toHaveBeenCalledBefore(onCommit);
    expect(onCommit).toHaveBeenCalledBefore(onAfterCommit);
  });

  it('should emit transaction lifecycle events when persistence failed', async () => {
    // arrange
    const id = faker.string.uuid();
    await uow.run((ctx) =>
      ctx.getRepository(EntityRepository).add(
        Entity.create({
          id,
          name: faker.person.fullName(),
          cards: [
            faker.finance.creditCardNumber(),
            faker.finance.creditCardNumber(),
          ],
        }),
      ),
    );

    const onBeforeFlush = jest.fn();
    const onFlush = jest.fn();
    const onAfterFlush = jest.fn();

    const onBeforeCommit = jest.fn();
    const onCommit = jest.fn();
    const onAfterCommit = jest.fn();

    const onBeforeRollback = jest.fn();
    const onRollback = jest.fn();
    const onAfterRollback = jest.fn();

    // act
    const act = () =>
      uow.run(
        async (ctx) => {
          ctx.transaction.on('beforeFlush', onBeforeFlush);
          ctx.transaction.on('flush', onFlush);
          ctx.transaction.on('afterFlush', onAfterFlush);
          ctx.transaction.on('beforeCommit', onBeforeCommit);
          ctx.transaction.on('commit', onCommit);
          ctx.transaction.on('afterCommit', onAfterCommit);
          ctx.transaction.on('beforeRollback', onBeforeRollback);
          ctx.transaction.on('rollback', onRollback);
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
          retries: 1,
        },
      );

    // assert
    await expect(act).rejects.toThrow();

    expect(onBeforeFlush).toHaveBeenCalledOnce();
    expect(onFlush).toHaveBeenCalledOnce();
    expect(onAfterFlush).not.toHaveBeenCalled();
    expect(onBeforeCommit).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(onAfterCommit).not.toHaveBeenCalled();
    expect(onBeforeRollback).toHaveBeenCalledOnce();
    expect(onRollback).toHaveBeenCalledOnce();
    expect(onAfterRollback).toHaveBeenCalledOnce();

    expect(onBeforeFlush).toHaveBeenCalledBefore(onFlush);
    expect(onFlush).toHaveBeenCalledBefore(onBeforeRollback);
    expect(onBeforeRollback).toHaveBeenCalledBefore(onRollback);
    expect(onRollback).toHaveBeenCalledBefore(onAfterRollback);
  });

  it('should emit transaction lifecycle events when unit failed', async () => {
    // arrange
    const onBeforeFlush = jest.fn();
    const onFlush = jest.fn();
    const onAfterFlush = jest.fn();

    const onBeforeCommit = jest.fn();
    const onCommit = jest.fn();
    const onAfterCommit = jest.fn();

    const onBeforeRollback = jest.fn();
    const onRollback = jest.fn();
    const onAfterRollback = jest.fn();

    // act
    const act = () =>
      uow.run(async (ctx) => {
        ctx.transaction.on('beforeFlush', onBeforeFlush);
        ctx.transaction.on('flush', onFlush);
        ctx.transaction.on('afterFlush', onAfterFlush);
        ctx.transaction.on('beforeCommit', onBeforeCommit);
        ctx.transaction.on('commit', onCommit);
        ctx.transaction.on('afterCommit', onAfterCommit);
        ctx.transaction.on('beforeRollback', onBeforeRollback);
        ctx.transaction.on('rollback', onRollback);
        ctx.transaction.on('afterRollback', onAfterRollback);

        throw new Error('Unit failed');
      });

    // assert
    await expect(act).rejects.toThrow();

    expect(onBeforeFlush).not.toHaveBeenCalled();
    expect(onFlush).not.toHaveBeenCalled();
    expect(onAfterFlush).not.toHaveBeenCalled();
    expect(onBeforeCommit).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(onAfterCommit).not.toHaveBeenCalled();

    expect(onBeforeRollback).toHaveBeenCalledOnce();
    expect(onRollback).toHaveBeenCalledOnce();
    expect(onAfterRollback).toHaveBeenCalledOnce();

    expect(onBeforeRollback).toHaveBeenCalledBefore(onRollback);
    expect(onRollback).toHaveBeenCalledBefore(onAfterRollback);
  });
});
