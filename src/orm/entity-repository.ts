import { Repository, RepositoryConstructor } from '../repository';
import {
  EntityDataMapper,
  EntityDataMapperConstructor,
} from './entity-data-mapper';
import { EntityPropertiesMap } from './entity-properties-map';
import { ObjectOperator } from './object-operator';

export interface EntityRepositoryOptions<E extends object> {
  identity: string | string[];
  properties: EntityPropertiesMap;
  dataMapperConstructor: EntityDataMapperConstructor<E>;
}

export interface EntityRepository<
  E extends object,
  M extends EntityDataMapper<E>,
> extends Repository<E, M> {
  find(
    ...args: Parameters<EntityDataMapper<E>['find']>
  ): Promise<E | undefined>;
}

export type EntityRepositoryConstructor<E extends object> =
  RepositoryConstructor<EntityRepository<E, EntityDataMapper<E>>>;

export function createRepository<E extends object>(
  options: EntityRepositoryOptions<E>,
): EntityRepositoryConstructor<E> {
  return class extends Repository<E, EntityDataMapper<E>> {
    protected mapperConstructor = options.dataMapperConstructor;

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
  };
}
