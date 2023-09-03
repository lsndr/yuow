import { BaseProperty } from './base-property';

export type EntityProperties = Record<string, BaseProperty>;

export class EntityPropertiesMap {
  constructor(private readonly properties: EntityProperties) {}

  getPropertyPath(databaseName: string) {
    let path: string | undefined;

    for (const propertyPath in this.properties) {
      if (this.properties[propertyPath]?.name === databaseName) {
        path = propertyPath;
      }
    }

    if (typeof path === 'undefined') {
      throw new Error(`Unknown database name: ${databaseName}`);
    }

    return path;
  }

  *entries(): Generator<[string, BaseProperty]> {
    for (const propertyName in this.properties) {
      const property = this.properties[propertyName];

      if (typeof property === 'undefined') {
        throw new Error(`Unknown property: ${propertyName}`);
      }

      yield [propertyName, property];
    }
  }
}
