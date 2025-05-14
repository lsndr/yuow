import type { BaseProperty } from './base-property';

export type EntityProperties = Readonly<Record<string, BaseProperty>>;

export class EntityPropertiesMap {
  public constructor(private readonly properties: EntityProperties) {}

  public get(path: string): BaseProperty | undefined {
    return this.properties[path];
  }

  public getPropertyPath(fieldName: string): string {
    let path: string | undefined;

    for (const propertyPath in this.properties) {
      if (this.properties[propertyPath]?.name === fieldName) {
        path = propertyPath;
      }
    }

    if (typeof path === 'undefined') {
      throw new Error(`Unknown database name: ${fieldName}`);
    }

    return path;
  }

  public *entries(): Generator<[string, BaseProperty]> {
    for (const propertyName in this.properties) {
      const property = this.properties[propertyName];

      if (typeof property === 'undefined') {
        throw new Error(`Unknown property: ${propertyName}`);
      }

      yield [propertyName, property];
    }
  }
}
