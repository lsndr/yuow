import { createDataMapper } from './entity-data-mapper';
import { EntityProperties, EntityPropertiesMap } from './entity-properties-map';
import { createRepository } from './entity-repository';

export interface SchemaOptions {
  version?: boolean | 'string';
  identity: string | string[];
  table: string;
}

export class Schema<E extends object> {
  public readonly properties: EntityPropertiesMap;

  constructor(
    // eslint-disable-next-line @typescript-eslint/ban-types -- Entity constructor can be private or protected
    public readonly entityConstructor: Function & { prototype: E },
    properties: EntityProperties,
    public readonly options: SchemaOptions,
  ) {
    this.properties = new EntityPropertiesMap(properties);
  }

  public createRepository() {
    const dataMapper = createDataMapper<E>({
      entityConstructor: this.entityConstructor,
      identity: this.options.identity,
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
