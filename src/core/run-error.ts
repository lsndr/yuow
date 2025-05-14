export class RunError extends AggregateError {
  public constructor(errors: any[]) {
    super(errors, 'Unit of work run has failed');
  }
}
