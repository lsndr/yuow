import { createDataMapper } from './entity-data-mapper';
import { EntityProperties, EntityPropertiesMap } from './entity-properties-map';
import { createRepository } from './entity-repository';

export interface SchemaOptions {
  version?: boolean | 'string';
  identity: string;
  table: string;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export class Schema<E extends object, C extends Function & { prototype: E }> {
  public readonly properties: EntityPropertiesMap;

  constructor(
    public readonly entityConstructor: C,
    properties: EntityProperties,
    public readonly options: SchemaOptions,
  ) {
    this.properties = new EntityPropertiesMap(properties);
  }

  public createRepository() {
    const dataMapper = createDataMapper<E>({
      entityConstructor: this.entityConstructor,
      properties: this.properties,
      table: this.options.table,
      version: this.options.version,
    });

    return createRepository<E>({
      dataMapperConstructor: dataMapper,
      properties: this.properties,
      identity: this.options.identity,
    });
  }
}
