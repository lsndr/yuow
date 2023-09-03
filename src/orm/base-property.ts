import { Knex } from 'knex';

export interface TransformOptions {
  knex: Knex;
}

export abstract class BaseProperty {
  constructor(public readonly name: string) {}

  abstract toDatabaseValue(value: unknown, options: TransformOptions): unknown;

  abstract fromDatabaseValue(
    value: unknown,
    options: TransformOptions,
  ): unknown;
}
