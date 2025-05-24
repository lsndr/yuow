export interface ComputedChanges<E extends object> {
  readonly created: E[];
  readonly updated: E[];
  readonly deleted: E[];
  readonly stale: E[];
}
