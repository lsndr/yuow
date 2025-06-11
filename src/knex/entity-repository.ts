import type { RepositoryConstructor } from '../core';
import type {
  EntityDataMapper,
  EntityDataMapperConstructor,
} from './entity-data-mapper';
import type { EntityPropertiesMap } from './entity-properties-map';
import type { KnexTransaction } from './knex-transaction';
import { EntityState, Repository } from '../core';
import { ObjectOperator } from './object-operator';
import type { Knex } from 'knex';

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

      if (!result) {
        return;
      }

      return this.changeTracker.getTrackedOrTrack(result, EntityState.LOADED);
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

    protected flushInsert(entity: E): Promise<boolean> {
      return this.mapper.insert(entity);
    }

    protected flushUpdate(entity: E): Promise<boolean> {
      return this.mapper.update(entity);
    }

    protected flushDelete(entity: E): Promise<boolean> {
      return this.mapper.delete(entity);
    }
  };
}
