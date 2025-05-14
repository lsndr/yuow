import { createDataMapper } from './entity-data-mapper';
import { EntityProperties, EntityPropertiesMap } from './entity-properties-map';
import { createRepository } from './entity-repository';

export interface SchemaOptions {
  readonly version?: boolean | 'string';
  readonly identity: string | readonly string[];
  readonly table: string;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Required for entity constructor
export type EntityConstructor<E> = Function & { prototype: E };

export class Schema<E extends object> {
  constructor(
    public readonly entityConstructor: EntityConstructor<E>,
    public readonly properties: EntityProperties,
    public readonly options: SchemaOptions,
  ) {}

  public createDataMapper() {
    return createDataMapper<E>({
      entityConstructor: this.entityConstructor,
      identity: this.options.identity,
      properties: new EntityPropertiesMap(this.properties),
      table: this.options.table,
      version: this.options.version,
    });
  }

  public createRepository() {
    return createRepository<E>({
      dataMapperConstructor: this.createDataMapper(),
      properties: new EntityPropertiesMap(this.properties),
      identity: this.options.identity,
    });
  }
}
