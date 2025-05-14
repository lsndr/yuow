import { resolve } from 'path';
import type { Knex } from 'knex';
import { knex } from 'knex';
import { faker } from '@faker-js/faker';
import { Entity } from './utils/entity';
import { VersionedEntityDataMapper } from './utils/versioned-entity.schema';
import { EntityDataMapper } from './utils/entity.schema';

describe('Knex – Data Mapper – Insert', () => {
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

  it('should insert a new versioned entity', async () => {
    // arrange
    const dataMapper = new VersionedEntityDataMapper(db);
    const entity = new Entity({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
    });

    // act
    const result = await dataMapper.insert(entity);

    // assert
    const record = await db('versioned_entity').where('id', entity.id).first();

    expect(result).toBeTruthy();
    expect(record).toEqual({
      id: entity.id,
      name: entity.name,
      version: 1,
    });
  });

  it('should insert an entity without version', async () => {
    // arrange
    const dataMapper = new EntityDataMapper(db);
    const entity = new Entity({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
    });

    // act
    const result = await dataMapper.insert(entity);

    // assert
    const record = await db('entity').where('id', entity.id).first();

    expect(result).toBeTruthy();
    expect(record).toEqual({
      id: entity.id,
      name: entity.name,
    });
  });

  it('should fail to insert a new entity if it already exists', async () => {
    // arrange
    const dataMapper = new VersionedEntityDataMapper(db);
    const entity = new Entity({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
    });
    await dataMapper.insert(entity);

    // act
    const act = () => dataMapper.insert(entity);

    // assert
    await expect(act).rejects.toThrow();
  });
});
