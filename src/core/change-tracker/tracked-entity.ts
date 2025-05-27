import { serialize } from 'node:v8';
import { type EntityState } from './entity-state';

/**
 * @internal
 */
export class TrackedEntity<E extends object> {
  public readonly ref: E;
  public state: EntityState;
  private snapshot: Buffer;

  public constructor(ref: E, state: EntityState) {
    this.ref = ref;
    this.state = state;

    this.snapshot = this.createSnapshot();
  }

  public revalidate(): boolean {
    const oldSnapshot = this.snapshot;
    const newSnapshot = this.createSnapshot();

    this.snapshot = newSnapshot;

    return oldSnapshot.equals(newSnapshot);
  }

  private createSnapshot() {
    return serialize(this.ref);
  }
}
