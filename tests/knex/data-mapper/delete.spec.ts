import { resolve } from 'path';
import type { Knex } from 'knex';
import { knex } from 'knex';
import { faker } from '@faker-js/faker';
import { Entity } from './utils/entity';
import { VersionedEntityDataMapper } from './utils/versioned-entity.schema';
import { EntityDataMapper } from './utils/entity.schema';

describe('Knex – Data Mapper – Delete', () => {
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

  describe('Versioned Entity', () => {
    it('should delete inserted entity', async () => {
      // arrange
      const dataMapper = new VersionedEntityDataMapper(db);
      const entity = new Entity({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
      });
      await dataMapper.insert(entity);

      // act
      const result = await dataMapper.delete(entity);

      // assert
      const record = await db('versioned_entity')
        .where('id', entity.id)
        .first();

      expect(result).toBeTruthy();
      expect(record).toBeUndefined();
    });

    it('should not delete entity if version increased', async () => {
      // arrange
      const dataMapper = new VersionedEntityDataMapper(db);
      const name = faker.person.fullName();
      const version = 3;
      const entity = new Entity({
        name,
        id: faker.string.uuid(),
      });
      await dataMapper.insert(entity);
      await db('versioned_entity').update({ version }).where('id', entity.id);

      // act
      const result = await dataMapper.delete(entity);

      // assert
      const record = await db('versioned_entity')
        .where('id', entity.id)
        .first();

      expect(result).toBeFalsy();
      expect(record).toEqual({
        name,
        version,
        id: entity.id,
      });
    });

    it('should delete loaded entity', async () => {
      // arrange
      const id = faker.string.uuid();
      const dataMapper = new VersionedEntityDataMapper(db);
      await dataMapper.insert(
        new Entity({
          id,
          name: faker.person.fullName(),
        }),
      );

      const entity = (await dataMapper.find((qb) =>
        qb.where('id', id),
      )) as Entity;

      // act
      const result = await dataMapper.delete(entity);

      // assert
      const record = await db('versioned_entity')
        .where('id', entity.id)
        .first();

      expect(result).toBeTruthy();
      expect(record).toBeUndefined();
    });
  });

  describe('Non-Versioned Entity', () => {
    it('should delete inserted entity', async () => {
      // arrange
      const dataMapper = new EntityDataMapper(db);
      const entity = new Entity({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
      });
      await dataMapper.insert(entity);

      // act
      const result = await dataMapper.delete(entity);

      // assert
      const record = await db('entity').where('id', entity.id).first();

      expect(result).toBeTruthy();
      expect(record).toBeUndefined();
    });
  });
});
