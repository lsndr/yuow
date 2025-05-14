import { BaseProperty } from './base-property';

export interface PropertyOptions {
  name: string;
}

export class Property extends BaseProperty {
  public constructor(options: PropertyOptions) {
    super(options.name);
  }

  public override toDatabaseValue(value: unknown): unknown {
    return value;
  }

  public override fromDatabaseValue(value: unknown): unknown {
    return value;
  }
}
