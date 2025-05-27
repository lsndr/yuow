import type { Knex } from 'knex';
import { WeakVersionTracker } from '../core/weak-version-tracker';
import type { EntityPropertiesMap } from './entity-properties-map';
import { ObjectOperator } from './object-operator';
import { KnexTransaction } from './knex-transaction';

export interface EntityDataMapperOptions<E extends object> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Required for entity constructor
  readonly entityConstructor: Function & { prototype: E };
  readonly identity: string | readonly string[];
  readonly properties: EntityPropertiesMap;
  readonly table: string;
  readonly version?: boolean | string;
}

export interface EntityDataMapper<E extends object> {
  find(where: (queryBuilder: Knex.QueryBuilder) => any): Promise<E | undefined>;
  insert(entity: E): Promise<boolean>;
  update(entity: E): Promise<boolean>;
  delete(entity: E): Promise<boolean>;
}

export type EntityDataMapperConstructor<E extends object> = new (
  knexOrTransaction: Knex | KnexTransaction,
) => EntityDataMapper<E>;

/**
 * @internal
 */
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

    public constructor(
      private readonly knexOrTransaction: Knex | KnexTransaction,
    ) {}

    public async find(
      where: (queryBuilder: Knex.QueryBuilder) => void,
    ): Promise<E | undefined> {
      const qb = this.knex.queryBuilder();

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

    public async insert(entity: E): Promise<boolean> {
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

      const result = await this.knex.insert(data).into(this.table);

      return (result[0] ?? 0) > 0;
    }

    public async update(entity: E): Promise<boolean> {
      const objectOperator = new ObjectOperator(entity);
      const data: Record<string, unknown> = {};

      for (const [path, property] of this.properties.entries()) {
        const value = await property.toDatabaseValue(
          objectOperator.extract(path),
        );

        data[property.name] = value;
      }

      const query = this.knex(this.table).update(data);

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

    public async delete(entity: E): Promise<boolean> {
      const query = this.knex.delete().from(options.table);

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

    private get knex() {
      return this.knexOrTransaction instanceof KnexTransaction
        ? this.knexOrTransaction.knex
        : this.knexOrTransaction;
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
