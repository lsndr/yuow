export interface ComputedChangesState<E> {
  readonly created: E[];
  readonly updated: E[];
  readonly deleted: E[];
  readonly stale: E[];
}

export class ComputedChanges<E extends object> {
  public readonly created: E[];
  public readonly updated: E[];
  public readonly deleted: E[];
  public readonly stale: E[];

  public constructor(state: ComputedChangesState<E>) {
    this.created = state.created;
    this.updated = state.updated;
    this.deleted = state.deleted;
    this.stale = state.deleted;
  }

  public count(): number {
    return (
      this.created.length +
      this.updated.length +
      this.deleted.length +
      this.stale.length
    );
  }
}
