import type { Knex } from 'knex';
import type { RepositoryConstructor } from '../core';
import { EntityState, Repository } from '../core';
import type {
  EntityDataMapper,
  EntityDataMapperConstructor,
} from './entity-data-mapper';
import type { EntityPropertiesMap } from './entity-properties-map';
import { ObjectOperator } from './object-operator';
import type {
  KnexTransaction,
  KnexTransactionEvents,
} from './knex-transaction';

export interface EntityRepositoryOptions<E extends object> {
  readonly identity: string | readonly string[];
  readonly properties: EntityPropertiesMap;
  readonly dataMapperConstructor: EntityDataMapperConstructor<E>;
}

export interface EntityRepository<E extends object>
  extends Repository<E, KnexTransaction, KnexTransactionEvents> {
  find(where: (queryBuilder: Knex.QueryBuilder) => any): Promise<E | undefined>;
}

export type EntityRepositoryConstructor<E extends object> =
  RepositoryConstructor<
    EntityRepository<E>,
    KnexTransaction,
    KnexTransactionEvents
  >;

export function createRepository<E extends object>(
  options: EntityRepositoryOptions<E>,
): EntityRepositoryConstructor<E> {
  return class extends Repository<E, KnexTransaction, KnexTransactionEvents> {
    private readonly mapper: EntityDataMapper<E>;

    public constructor(transaction: KnexTransaction) {
      super(transaction);

      this.mapper = new options.dataMapperConstructor(this.transaction);
    }

    public async find(where: (qb: Knex.QueryBuilder) => any) {
      const result = await this.mapper.find(where);

      return this.trackAll(result, EntityState.LOADED);
    }

    protected override extractIdentity(entity: E): unknown {
      const objectOperator = new ObjectOperator(entity);
      const identityPaths = Array.isArray(options.identity)
        ? options.identity
        : [options.identity];

      const identities = identityPaths.reduce<unknown[]>((array, path) => {
        array.push(objectOperator.extract(path));

        return array;
      }, []);

      return JSON.stringify(identities);
    }

    protected insert(entity: E): Promise<boolean> {
      return this.mapper.insert(entity);
    }

    protected update(entity: E): Promise<boolean> {
      return this.mapper.update(entity);
    }

    protected remove(entity: E): Promise<boolean> {
      return this.mapper.delete(entity);
    }
  };
}
