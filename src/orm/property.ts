import { BaseProperty } from './base-property';

export interface PropertyOptions {
  name: string;
}

export class Property extends BaseProperty {
  constructor(options: PropertyOptions) {
    super(options.name);
  }

  override toDatabaseValue(value: unknown) {
    return value;
  }

  override fromDatabaseValue(value: unknown) {
    return value;
  }
}
