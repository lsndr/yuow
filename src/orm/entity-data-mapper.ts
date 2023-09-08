import { Knex } from 'knex';
import { DataMapper, DataMapperConstructor } from '../data-mapper';
import { EntityPropertiesMap } from './entity-properties-map';
import { ObjectOperator } from './object-operator';

export interface EntityDataMapperOptions<E extends object> {
  // eslint-disable-next-line @typescript-eslint/ban-types -- Entity constructor can be private or protected
  entityConstructor: Function & { prototype: E };
  identity: string | string[];
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
  return class extends DataMapper<E> {
    private readonly table = options.table;
    private readonly properties = options.properties;
    private readonly entityConstructor = options.entityConstructor;
    private readonly versionDatabaseFieldName =
      typeof options.version === 'string' ? options.version : 'version';
    private readonly identities = Array.isArray(options.identity)
      ? options.identity
      : [options.identity];
    private readonly useVersion = !!options.version;

    constructor(knex: Knex) {
      super(knex);
    }

    private *extractIdentities(entity: E) {
      const entityOperator = new ObjectOperator(entity);

      for (const identityPath of this.identities) {
        const property = this.properties.get(identityPath);
        const value = entityOperator.extract(identityPath);

        if (typeof property === 'undefined') {
          throw new Error(`Couldn't find identity property: ${identityPath}`);
        }

        yield [property.name, value] as const;
      }
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

      const entity = Object.create(this.entityConstructor.prototype);
      await this.hydrate(entity, record);

      if (this.useVersion) {
        this.setVersion(entity, record[this.versionDatabaseFieldName]);
      }

      return entity;
    }

    override async insert(entity: E): Promise<boolean> {
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

      if (this.useVersion) {
        data[this.versionDatabaseFieldName] = this.getVersion(entity);
      }

      const result = await this.knex.insert(data).into(this.table);

      return (result[0] || 0) > 0;
    }

    override async update(entity: E): Promise<boolean> {
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

      const query = this.knex(this.table).update(data);

      for (const [name, value] of this.extractIdentities(entity)) {
        query.where(name, value as any);
      }

      if (options.version) {
        const version = this.increaseVersion(entity);

        query.where('version', version - 1);
        query.update(this.versionDatabaseFieldName, version);
      }

      const result = await query;

      return result > 0;
    }

    override async delete(entity: E): Promise<boolean> {
      const query = this.knex.delete().from(options.table);

      for (const [name, value] of this.extractIdentities(entity)) {
        query.where(name, value as any);
      }

      if (options.version) {
        const version = this.getVersion(entity);

        query.where('version', version);
      }

      const result = await query;

      return result > 0;
    }

    private async hydrate(entity: E, data: any) {
      const objectOperator = new ObjectOperator(entity);

      for (const [path, property] of options.properties.entries()) {
        const value = await property.fromDatabaseValue(data[property.name], {
          knex: this.knex,
        });

        objectOperator.put(path, value);
      }
    }
  };
}
