import { Repository, RepositoryConstructor, EntityState } from '../core';
import {
  EntityDataMapper,
  EntityDataMapperConstructor,
} from './entity-data-mapper';
import { EntityPropertiesMap } from './entity-properties-map';
import { ObjectOperator } from './object-operator';
import { KnexTransaction } from './knex-transaction';
import { Knex } from 'knex';

export interface EntityRepositoryOptions<E extends object> {
  identity: string | string[];
  properties: EntityPropertiesMap;
  dataMapperConstructor: EntityDataMapperConstructor<E>;
}

export interface EntityRepository<E extends object>
  extends Repository<E, KnexTransaction> {
  find(where: (queryBuilder: Knex.QueryBuilder) => any): Promise<E | undefined>;
}

export type EntityRepositoryConstructor<E extends object> =
  RepositoryConstructor<EntityRepository<E>, KnexTransaction>;

export function createRepository<E extends object>(
  options: EntityRepositoryOptions<E>,
): EntityRepositoryConstructor<E> {
  return class extends Repository<E, KnexTransaction> {
    private readonly mapper: EntityDataMapper<E>;

    constructor(transaction: KnexTransaction) {
      super(transaction);

      this.mapper = new options.dataMapperConstructor(this.transaction);
    }

    async find(where: (qb: Knex.QueryBuilder) => any) {
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
