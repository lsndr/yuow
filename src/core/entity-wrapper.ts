import { serialize } from 'node:v8';
import { EntityState } from './entity-state';

export class EntityWrapper<E extends object> {
  public readonly entity: E;
  public state: EntityState;
  private snapshot: Buffer;

  constructor(entity: E, state: EntityState) {
    this.entity = entity;
    this.state = state;

    this.snapshot = this.createSnapshot();
  }

  verify() {
    const oldSnapshot = this.snapshot;
    const newSnapshot = this.createSnapshot();

    this.snapshot = newSnapshot;

    return oldSnapshot.equals(newSnapshot);
  }

  private createSnapshot() {
    return serialize(this.entity);
  }
}
