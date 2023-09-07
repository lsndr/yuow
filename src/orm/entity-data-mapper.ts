import { Knex } from 'knex';
import { DataMapper, DataMapperConstructor } from '../data-mapper';
import { EntityPropertiesMap } from './entity-properties-map';
import { ObjectOperator } from './object-operator';

export interface EntityDataMapperOptions<E extends object> {
  // eslint-disable-next-line @typescript-eslint/ban-types
  entityConstructor: Function & { prototype: E };
  properties: EntityPropertiesMap;
  table: string;
  version?: boolean | string;
}

export interface EntityDataMapper<E extends object> extends DataMapper<E> {
  find(
    where: (queryBuilder: Knex.QueryBuilder) => void,
  ): Promise<E | undefined>;
}

export type EntityDataMapperConstructor<E extends object> =
  DataMapperConstructor<E, EntityDataMapper<E>>;

export function createDataMapper<E extends object>(
  options: EntityDataMapperOptions<E>,
): EntityDataMapperConstructor<E> {
  const versionFieldName =
    typeof options.version === 'string' ? options.version : 'version';

  return class extends DataMapper<E> {
    private readonly table: string;
    private readonly properties: EntityPropertiesMap;

    constructor(knex: Knex) {
      super(knex);

      this.table = options.table;
      this.properties = options.properties;
    }

    async find(
      where: (queryBuilder: Knex.QueryBuilder) => void,
    ): Promise<E | undefined> {
      const knex = this.knex.queryBuilder();

      const record = await knex
        .select('*')
        .from(this.table)
        .where(where)
        .first();

      if (!record) {
        return;
      }

      const entity = Object.create(options.entityConstructor.prototype);
      await this.hydrate(entity, record);

      if (options.version) {
        this.setVersion(entity, record[versionFieldName]);
      }

      return entity;
    }

    override async insert(entity: E): Promise<boolean> {
      const knex = this.knex.queryBuilder();
      const objectOperator = new ObjectOperator(entity);
      const data: Record<string, unknown> = {};

      for (const [path, property] of this.properties.entries()) {
        const value = await property.toDatabaseValue(
          objectOperator.extract(path),
          {
            knex: this.knex,
          },
        );

        data[property.name] = value;
      }

      if (options.version) {
        data[versionFieldName] = this.getVersion(entity);
      }

      const result = await knex.insert(data).into(this.table);

      return (result[0] || 0) > 0;
    }

    override update(_entity: E): Promise<boolean> {
      return Promise.resolve(false);
    }

    override delete(_entity: E): Promise<boolean> {
      return Promise.resolve(false);
    }

    private async hydrate(entity: E, data: any) {
      const objectOperator = new ObjectOperator(entity);

      for (const [path, property] of this.properties.entries()) {
        const value = await property.fromDatabaseValue(data[property.name], {
          knex: this.knex,
        });

        objectOperator.put(path, value);
      }
    }
  };
}
