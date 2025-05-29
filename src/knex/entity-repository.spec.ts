import { type EntityRepository } from './entity-repository';
import { KnexTransaction } from './knex-transaction';
import { Entity } from '../../tests/utils/entities/entity';
import { createEntitySchema } from '../../tests/utils/entities/entity.schema';
import { createKnexConnection } from '../../tests/utils/knex/connection';
import { type Knex } from 'knex';

describe('EntityRepository', () => {
  let knex: Knex;
  let entity: Entity;
  let entityRepository: EntityRepository<Entity>;
  let transaction: KnexTransaction;

  beforeEach(async () => {
    const { schema, migration } = createEntitySchema();

    knex = await createKnexConnection(migration);
    transaction = new KnexTransaction(knex);
    entityRepository = new (schema.createRepository())(transaction);

    const dataMapper = new (schema.createDataMapper())(knex);

    entity = Entity.generate();
    await dataMapper.insert(entity);
  });

  afterEach(() => knex.destroy());

  describe('find', () => {
    it('should return the same reference to the entity', async () => {
      // act
      const entity1 = await entityRepository.find((qb) =>
        qb.where('id', entity.id),
      );
      const entity2 = await entityRepository.find((qb) =>
        qb.where('id', entity.id),
      );

      // assert
      expect(entity1).toBe(entity2);
    });
  });
});
