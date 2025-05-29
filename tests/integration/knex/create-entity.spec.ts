import { Uow } from '../../../src/core';
import {
  type EntityRepositoryConstructor,
  KnexEngine,
} from '../../../src/knex';
import { Entity } from '../../utils/entities/entity';
import { createEntitySchema } from '../../utils/entities/entity.schema';
import { createKnexConnection } from '../../utils/knex/connection';
import { faker } from '@faker-js/faker';
import type { Knex } from 'knex';

describe('Create Entity', () => {
  let db: Knex;
  let uow: Uow<KnexEngine>;
  let EntityRepository: EntityRepositoryConstructor<Entity>;

  beforeEach(async () => {
    const entity = createEntitySchema();

    db = await createKnexConnection(entity.migration);
    uow = new Uow(new KnexEngine(db));
    EntityRepository = entity.schema.createRepository();
  });

  afterEach(() => db.destroy());

  describe.each([{ global: true }, { global: false }])(
    'Transaction Config: %j',
    (transaction) => {
      it('should persist a new entity', async () => {
        // arrange
        const id = faker.string.uuid();
        const name = faker.person.fullName();
        const cards = [
          faker.finance.creditCardNumber(),
          faker.finance.creditCardNumber(),
        ];

        // act
        await uow.run(
          (ctx) => {
            ctx
              .getRepository(EntityRepository)
              .add(new Entity({ id, name, cards }));
          },
          { transaction },
        );

        // assert
        const entity = await uow.run((ctx) =>
          ctx.getRepository(EntityRepository).find((qb) => qb.where('id', id)),
        );

        expect(entity).toBeInstanceOf(Entity);
        expect(entity?.id).toBe(id);
        expect(entity?.name).toBe(name);
        expect(entity?.cards).toEqual(cards);
      });
    },
  );
});
