export abstract class BaseProperty {
  constructor(public readonly name: string) {}

  abstract toDatabaseValue(value: unknown): unknown;

  abstract fromDatabaseValue(value: unknown): unknown;
}
