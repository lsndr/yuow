import { BaseProperty } from './base-property';

export interface JsonPropertyOptions {
  name: string;
}

export class JsonProperty extends BaseProperty {
  constructor(options: JsonPropertyOptions) {
    super(options.name);
  }

  override toDatabaseValue(value: unknown) {
    return JSON.stringify(value);
  }

  override fromDatabaseValue(value: unknown) {
    return typeof value === 'string' ? JSON.parse(value) : value;
  }
}
