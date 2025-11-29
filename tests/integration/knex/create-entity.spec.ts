import { Context, Transactional, Uow, UowContext } from '../../../src/core';
import {
  type EntityRepositoryConstructor,
  KnexEngine,
} from '../../../src/knex';
import { Entity } from '../../.config/entities/entity';
import { createEntitySchema } from '../../.config/entities/entity.schema';
import { createKnexConnection } from '../../.config/knex/connection';
import { faker } from '@faker-js/faker';
import type { Knex } from 'knex';
import { beforeEach, describe, it, expect, afterEach } from 'vitest';

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
      let testService: TestService;

      class TestService {
        @Transactional({ transaction })
        public test(unit: () => void) {
          unit();
        }
      }

      beforeEach(() => {
        testService = new TestService();
      });

      it('should persist a new entity', async () => {
        // arrange
        const id = faker.string.uuid();
        const name = faker.person.fullName();
        const cards = [
          faker.finance.creditCardNumber(),
          faker.finance.creditCardNumber(),
        ];

        // act
        await UowContext.create(uow, () =>
          testService.test(() => {
            Context.getRepository(EntityRepository).add(
              new Entity({ id, name, cards }),
            );
          }),
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
