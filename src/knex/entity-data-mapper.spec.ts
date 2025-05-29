import { type EntityDataMapper } from './entity-data-mapper';
import { type Schema } from './schema';
import { Entity } from '../../tests/utils/entities/entity';
import { createEntitySchema } from '../../tests/utils/entities/entity.schema';
import { createKnexConnection } from '../../tests/utils/knex/connection';
import { faker } from '@faker-js/faker';
import { type Knex } from 'knex';

describe('EntityDataMapper', () => {
  let entities: [Entity, Entity];
  let knex: Knex;

  let versionedEntity: {
    schema: Schema<Entity>;
    dataMapper: EntityDataMapper<Entity>;
  };

  let unversionedEntity: {
    schema: Schema<Entity>;
    dataMapper: EntityDataMapper<Entity>;
  };

  beforeEach(async () => {
    const versioned = createEntitySchema();
    const unversioned = createEntitySchema({
      version: false,
    });

    knex = await createKnexConnection(
      versioned.migration,
      unversioned.migration,
    );

    versionedEntity = {
      schema: versioned.schema,
      dataMapper: new (versioned.schema.createDataMapper())(knex),
    };

    unversionedEntity = {
      schema: unversioned.schema,
      dataMapper: new (unversioned.schema.createDataMapper())(knex),
    };

    entities = [Entity.generate(), Entity.generate()];
    await Promise.all(
      entities.map((entity) =>
        Promise.all([
          versionedEntity.dataMapper.insert(entity),
          unversionedEntity.dataMapper.insert(entity),
        ]),
      ),
    );
  });

  afterEach(() => knex.destroy());

  describe('find', () => {
    it.each([0, 1])('should find entities[%s] by id', async (i) => {
      // arrange
      const entity = entities[i]!;

      // act
      const result = await versionedEntity.dataMapper.find((qb) =>
        qb.where({ id: entity.id }),
      );

      // assert
      expect(result).toBeInstanceOf(Entity);
      expect(result).toEqual(entity);
    });

    it.each([0, 1])('should find entities[%s] by name', async (i) => {
      // arrange
      const entity = entities[i]!;

      // act
      const result = await versionedEntity.dataMapper.find((qb) =>
        qb.where({ name: entity.name }),
      );

      // assert
      expect(result).toBeInstanceOf(Entity);
      expect(result).toEqual(entity);
    });

    it('should return undefined if entity not found', async () => {
      // act
      const result = await versionedEntity.dataMapper.find((qb) =>
        qb.where({ id: faker.string.uuid() }),
      );

      // assert
      expect(result).toBeUndefined();
    });

    it('should fail if search criteria is too wide', async () => {
      const act = () => versionedEntity.dataMapper.find((qb) => qb);

      await expect(act).rejects.toThrow(
        new Error(
          `Expected one record, but found ${entities.length} for entity ${versionedEntity.schema.entityConstructor.name}`,
        ),
      );
    });
  });

  describe('insert', () => {
    it('should insert versioned entity', async () => {
      // arrange
      const entity = Entity.generate();

      // act
      const result = await versionedEntity.dataMapper.insert(entity);

      // assert
      const record = await knex(versionedEntity.schema.options.table)
        .select('*')
        .where({ id: entity.id })
        .first();
      expect(result).toBe(true);
      expect(record).toEqual({
        id: entity.id,
        name: entity.name,
        cards: JSON.stringify(entity.cards),
        version: 1,
      });
    });

    it('should insert unversioned entity', async () => {
      // arrange
      const entity = Entity.generate();

      // act
      const result = await unversionedEntity.dataMapper.insert(entity);

      // assert
      const record = await knex(unversionedEntity.schema.options.table)
        .select('*')
        .where({ id: entity.id })
        .first();
      expect(result).toBe(true);
      expect(record).toEqual({
        id: entity.id,
        name: entity.name,
        cards: JSON.stringify(entity.cards),
      });
    });
  });

  describe('update', () => {
    it('should update versioned entity', async () => {
      // arrange
      const entity = entities[0];
      entity.name = faker.person.fullName();

      // act
      const result = await versionedEntity.dataMapper.update(entity);

      // assert
      expect(result).toBe(true);
      const record = await knex(versionedEntity.schema.options.table)
        .select('*')
        .where({ id: entity.id })
        .first();
      expect(record).toEqual({
        id: entity.id,
        name: entity.name,
        cards: JSON.stringify(entity.cards),
        version: 2,
      });
    });

    it('should update unversioned entity', async () => {
      // arrange
      const entity = entities[0];
      entity.name = faker.person.fullName();

      // act
      const result = await unversionedEntity.dataMapper.update(entity);

      // assert
      expect(result).toBe(true);
      const record = await knex(unversionedEntity.schema.options.table)
        .select('*')
        .where({ id: entity.id })
        .first();
      expect(record).toEqual({
        id: entity.id,
        name: entity.name,
        cards: JSON.stringify(entity.cards),
      });
    });

    it('should not update versioned entity due to concurrency', async () => {
      // arrange
      const entity = entities[0];
      const oldName = entity.name;
      entity.name = faker.person.fullName();

      await knex(versionedEntity.schema.options.table)
        .update({ version: knex.raw('version + 1') })
        .where({ id: entity.id });

      // act
      const result = await versionedEntity.dataMapper.update(entity);

      // assert
      expect(result).toBe(false);
      const record = await knex(versionedEntity.schema.options.table)
        .select('*')
        .where({ id: entity.id })
        .first();
      expect(record).toEqual({
        id: entity.id,
        name: oldName,
        cards: JSON.stringify(entity.cards),
        version: 2,
      });
    });
  });

  describe('delete', () => {
    it('should delete versioned entity', async () => {
      // arrange
      const entity = entities[0];

      // act
      const result = await versionedEntity.dataMapper.delete(entity);

      // assert
      expect(result).toBe(true);
      const record = await knex(versionedEntity.schema.options.table)
        .select('*')
        .where({ id: entity.id })
        .first();
      expect(record).toBeUndefined();
    });

    it('should delete unversioned entity', async () => {
      // arrange
      const entity = entities[0];

      // act
      const result = await unversionedEntity.dataMapper.delete(entity);

      // assert
      expect(result).toBe(true);
      const record = await knex(unversionedEntity.schema.options.table)
        .select('*')
        .where({ id: entity.id })
        .first();
      expect(record).toBeUndefined();
    });

    it('should not delete versioned entity due to concurrency', async () => {
      // arrange
      const entity = entities[0];
      await knex(versionedEntity.schema.options.table)
        .update({ version: knex.raw('version + 1') })
        .where({ id: entity.id });

      // act
      const result = await versionedEntity.dataMapper.delete(entity);

      // assert
      expect(result).toBe(false);
      const record = await knex(versionedEntity.schema.options.table)
        .select('*')
        .where({ id: entity.id })
        .first();
      expect(record).toEqual({
        id: entity.id,
        name: entity.name,
        cards: JSON.stringify(entity.cards),
        version: 2,
      });
    });
  });
});
