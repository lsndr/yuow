import { resolve } from 'path';
import { knex } from 'knex';
import type { Knex } from 'knex';
import { Uow } from '../../src/core';
import { KnexEngine } from './utils/knex.engine';

describe('Unit of Work', () => {
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

  it('should propagate an error', async () => {
    let attempts = 0;

    const action = () =>
      uow.run(() => {
        attempts++;
        throw new Error('Test error');
      });

    await expect(action).rejects.toThrow(new Error('Test error'));
    expect(attempts).toBe(1);
  });

  it('should propagate a result', async () => {
    const result = await uow.run(() => {
      return 'test result';
    });

    expect(result).toBe('test result');
  });
});
