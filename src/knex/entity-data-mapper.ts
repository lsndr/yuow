import { Knex } from 'knex';
import { EntityPropertiesMap } from './entity-properties-map';
import { ObjectOperator } from './object-operator';
import { WeakVersionTracker } from '../core/weak-version-tracker';
import { KnexTransaction } from './knex-transaction';

export interface EntityDataMapperOptions<E extends object> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Required for entity constructor
  entityConstructor: Function & { prototype: E };
  identity: string | string[];
  properties: EntityPropertiesMap;
  table: string;
  version?: boolean | string;
}

export interface EntityDataMapper<E extends object> {
  find(where: (queryBuilder: Knex.QueryBuilder) => any): Promise<E | undefined>;
  insert(entity: E): Promise<boolean>;
  update(entity: E): Promise<boolean>;
  delete(entity: E): Promise<boolean>;
}

export type EntityDataMapperConstructor<E extends object> = new (
  transaction: KnexTransaction,
) => EntityDataMapper<E>;

export function createDataMapper<E extends object>(
  options: EntityDataMapperOptions<E>,
): EntityDataMapperConstructor<E> {
  return class {
    private readonly table = options.table;
    private readonly properties = options.properties;
    private readonly entityConstructor = options.entityConstructor;
    private readonly versionDatabaseFieldName =
      typeof options.version === 'string' ? options.version : 'version';
    private readonly identities = Array.isArray(options.identity)
      ? options.identity
      : [options.identity];
    private readonly useVersion = !!options.version;
    private readonly versionTracker = new WeakVersionTracker<E>();

    constructor(private readonly transaction: KnexTransaction) {}

    async find(
      where: (queryBuilder: Knex.QueryBuilder) => void,
    ): Promise<E | undefined> {
      const qb = this.transaction.knex.queryBuilder();

      const record = await qb.select('*').from(this.table).where(where).first();

      if (!record) {
        return;
      }

      const entity = Object.create(this.entityConstructor.prototype);
      await this.hydrate(entity, record);

      if (this.useVersion) {
        this.versionTracker.setVersion(
          entity,
          record[this.versionDatabaseFieldName],
        );
      }

      return entity;
    }

    async insert(entity: E): Promise<boolean> {
      const objectOperator = new ObjectOperator(entity);
      const data: Record<string, unknown> = {};

      for (const [path, property] of this.properties.entries()) {
        const value = await property.toDatabaseValue(
          objectOperator.extract(path),
        );

        data[property.name] = value;
      }

      if (this.useVersion) {
        data[this.versionDatabaseFieldName] =
          this.versionTracker.getVersion(entity);
      }

      const result = await this.transaction.knex.insert(data).into(this.table);

      return (result[0] || 0) > 0;
    }

    async update(entity: E): Promise<boolean> {
      const objectOperator = new ObjectOperator(entity);
      const data: Record<string, unknown> = {};

      for (const [path, property] of this.properties.entries()) {
        const value = await property.toDatabaseValue(
          objectOperator.extract(path),
        );

        data[property.name] = value;
      }

      const query = this.transaction.knex(this.table).update(data);

      for (const [name, value] of this.extractIdentities(entity)) {
        query.where(name, value as any);
      }

      if (options.version) {
        const version = this.versionTracker.increaseVersion(entity);

        query.where('version', version - 1);
        query.update(this.versionDatabaseFieldName, version);
      }

      const result = await query;

      return result > 0;
    }

    async delete(entity: E): Promise<boolean> {
      const query = this.transaction.knex.delete().from(options.table);

      for (const [name, value] of this.extractIdentities(entity)) {
        query.where(name, value as any);
      }

      if (options.version) {
        const version = this.versionTracker.getVersion(entity);

        query.where('version', version);
      }

      const result = await query;

      return result > 0;
    }

    private async hydrate(entity: E, data: any) {
      const objectOperator = new ObjectOperator(entity);

      for (const [path, property] of options.properties.entries()) {
        const value = await property.fromDatabaseValue(data[property.name]);

        objectOperator.put(path, value);
      }
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
  };
}
