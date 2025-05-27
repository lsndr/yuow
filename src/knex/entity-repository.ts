import type { Knex } from 'knex';
import type { RepositoryConstructor } from '../core';
import { EntityState, Repository } from '../core';
import type {
  EntityDataMapper,
  EntityDataMapperConstructor,
} from './entity-data-mapper';
import type { EntityPropertiesMap } from './entity-properties-map';
import { ObjectOperator } from './object-operator';
import type { KnexTransaction } from './knex-transaction';

export interface EntityRepositoryOptions<E extends object> {
  readonly identity: string | readonly string[];
  readonly properties: EntityPropertiesMap;
  readonly dataMapperConstructor: EntityDataMapperConstructor<E>;
}

export interface EntityRepository<E extends object>
  extends Repository<E, KnexTransaction> {
  find(where: (queryBuilder: Knex.QueryBuilder) => any): Promise<E | undefined>;
}

export type EntityRepositoryConstructor<E extends object> =
  RepositoryConstructor<EntityRepository<E>, KnexTransaction>;

/**
 * @internal
 */
export function createRepository<E extends object>(
  options: EntityRepositoryOptions<E>,
): EntityRepositoryConstructor<E> {
  return class extends Repository<E, KnexTransaction> {
    private readonly mapper: EntityDataMapper<E>;

    public constructor(transaction: KnexTransaction) {
      super(transaction);

      this.mapper = new options.dataMapperConstructor(this.transaction);
    }

    public async find(where: (qb: Knex.QueryBuilder) => any) {
      const result = await this.mapper.find(where);

      if (result) {
        this.changeTracker.track(result, EntityState.LOADED);
      }

      return result;
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

    protected doInsert(entity: E): Promise<boolean> {
      return this.mapper.insert(entity);
    }

    protected doUpdate(entity: E): Promise<boolean> {
      return this.mapper.update(entity);
    }

    protected doDelete(entity: E): Promise<boolean> {
      return this.mapper.delete(entity);
    }
  };
}
