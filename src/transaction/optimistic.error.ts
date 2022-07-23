export class OptimisticError extends Error {
  constructor(repositoryName: string, identity: any) {
    super();

    this.name = 'OptimisticError';
    this.message = `${repositoryName} cannot perform an operation on entity with identity "${identity}"`;
  }
}
