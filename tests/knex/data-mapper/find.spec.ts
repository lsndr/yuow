import { resolve } from 'path';
import type { Knex } from 'knex';
import { knex } from 'knex';
import { faker } from '@faker-js/faker';
import { Entity } from './utils/entity';
import { EntityDataMapper } from './utils/entity.schema';

describe('Knex – Data Mapper – Find', () => {
  let db: Knex;

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
      migrations: {
        directory: resolve(__dirname, 'utils/migrations'),
      },
    });

    await db.migrate.latest();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('should find entity by id', async () => {
    // arrange
    const dataMapper = new EntityDataMapper(db);
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    await dataMapper.insert(
      new Entity({
        id,
        name,
      }),
    );

    // act
    const entity = await dataMapper.find((qb) => qb.where('id', id));

    // assert
    expect(entity).toBeInstanceOf(Entity);
    expect(entity?.id).toBe(id);
    expect(entity?.name).toBe(name);
  });

  it('should return undefined if entity does not exist', async () => {
    // arrange
    const dataMapper = new EntityDataMapper(db);
    const id = faker.string.uuid();
    const name = faker.person.fullName();
    await dataMapper.insert(
      new Entity({
        id,
        name,
      }),
    );

    // act
    const entity = await dataMapper.find((qb) =>
      qb.where('id', faker.string.uuid()),
    );

    // assert
    expect(entity).toBeUndefined();
  });
});
