export class RunError extends AggregateError {
  constructor(errors: any[]) {
    super(errors, 'Unit of work run has failed');
  }
}
