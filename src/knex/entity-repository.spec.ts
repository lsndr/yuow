import { type EntityDataMapper } from './entity-data-mapper';
import { type EntityRepository } from './entity-repository';
import { KnexTransaction } from './knex-transaction';
import { Entity } from '../../tests/utils/entities/entity';
import { createEntitySchema } from '../../tests/utils/entities/entity.schema';
import { createKnexConnection } from '../../tests/utils/knex/connection';
import { faker } from '@faker-js/faker';
import { type Knex } from 'knex';

describe('EntityRepository', () => {
  let knex: Knex;
  let entity: Entity;
  let entityRepository: EntityRepository<Entity>;
  let entityDataMapper: EntityDataMapper<Entity>;
  let transaction: KnexTransaction;

  beforeEach(async () => {
    const { schema, migration } = createEntitySchema();

    knex = await createKnexConnection(migration);
    transaction = new KnexTransaction(knex);
    entityRepository = new (schema.createRepository())(transaction);

    entityDataMapper = new (schema.createDataMapper())(knex);

    entity = Entity.generate();
    await entityDataMapper.insert(entity);
  });

  afterEach(() => knex.destroy());

  describe('find', () => {
    it('should find entity', async () => {
      // act
      const result = await entityRepository.find((qb) =>
        qb.where('id', entity.id),
      );

      // assert
      expect(result).toEqual(result);
    });
  });

  describe('flush', () => {
    it('should insert entity', async () => {
      // arrange
      const newEntity = Entity.generate();
      entityRepository.add(newEntity);

      // act
      await entityRepository.flush();
      await transaction.commit();

      // assert
      const foundEntity = await entityDataMapper.find((qb) =>
        qb.where('id', newEntity.id),
      );
      expect(foundEntity).toEqual(newEntity);
    });

    it('should update entity', async () => {
      // arrange
      const exisitngEntity = (await entityRepository.find((qb) =>
        qb.where('id', entity.id),
      ))!;
      exisitngEntity.name = faker.person.fullName();

      // act
      await entityRepository.flush();
      await transaction.commit();

      // assert
      const foundEntity = await entityDataMapper.find((qb) =>
        qb.where('id', exisitngEntity.id),
      );
      expect(foundEntity).toEqual(exisitngEntity);
    });

    it('should delete entity', async () => {
      // arrange
      const exisitngEntity = (await entityRepository.find((qb) =>
        qb.where('id', entity.id),
      ))!;
      entityRepository.delete(exisitngEntity);

      // act
      await entityRepository.flush();
      await transaction.commit();

      // assert
      const foundEntity = await entityDataMapper.find((qb) =>
        qb.where('id', exisitngEntity.id),
      );
      expect(foundEntity).toBeUndefined();
    });
  });
});
