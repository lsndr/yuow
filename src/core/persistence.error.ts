export type PersistenceOperation = 'delete' | 'insert' | 'update';

export class PersistenceError extends Error {
  public constructor(
    public readonly repositoryName: string,
    public readonly identity: unknown,
    public readonly operation: PersistenceOperation,
  ) {
    super();

    this.message = `${repositoryName} cannot perform an ${operation} operation on entity with identity "${String(identity)}"`;
  }
}
