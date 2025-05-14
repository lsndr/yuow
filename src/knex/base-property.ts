export abstract class BaseProperty {
  public constructor(public readonly name: string) {}

  public abstract toDatabaseValue(value: unknown): unknown;

  public abstract fromDatabaseValue(value: unknown): unknown;
}
