import { BaseProperty } from './base-property';

export interface JsonPropertyOptions {
  name: string;
}

export class JsonProperty extends BaseProperty {
  public constructor(options: JsonPropertyOptions) {
    super(options.name);
  }

  public override toDatabaseValue(value: unknown): unknown {
    return JSON.stringify(value);
  }

  public override fromDatabaseValue(value: unknown): unknown {
    return typeof value === 'string' ? JSON.parse(value) : value;
  }
}
