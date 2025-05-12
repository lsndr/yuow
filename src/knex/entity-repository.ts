import { Repository, RepositoryConstructor } from '../core/repository';
import {
  EntityDataMapper,
  EntityDataMapperConstructor,
} from './entity-data-mapper';
import { EntityPropertiesMap } from '../core/orm/entity-properties-map';
import { ObjectOperator } from '../core/orm/object-operator';
import { KnexTransaction } from './knex.transaction';
import { DBContext } from '../core/db-context';

export interface EntityRepositoryOptions<E extends object> {
  identity: string | string[];
  properties: EntityPropertiesMap;
  dataMapperConstructor: EntityDataMapperConstructor<E>;
}

export interface EntityRepository<E extends object>
  extends Repository<E, KnexTransaction> {
  find(
    ...args: Parameters<EntityDataMapper<E>['find']>
  ): Promise<E | undefined>;
}

export type EntityRepositoryConstructor<E extends object> =
  RepositoryConstructor<EntityRepository<E>, KnexTransaction>;

export function createRepository<E extends object>(
  options: EntityRepositoryOptions<E>,
): EntityRepositoryConstructor<E> {
  return class extends Repository<E, KnexTransaction> {
    private readonly mapper: EntityDataMapper<E>;

    constructor(context: DBContext<KnexTransaction>) {
      super(context);

      this.mapper = new options.dataMapperConstructor(
        this.context.transaction.knex,
      );
    }

    async find(...args: Parameters<EntityDataMapper<E>['find']>) {
      const result = await this.mapper.find(...args);

      return this.trackAll(result, 'loaded');
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
