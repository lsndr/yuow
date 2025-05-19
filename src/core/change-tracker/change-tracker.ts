import { WeakIdentityMap } from 'weak-identity-map';
import { TrackedEntity } from './tracked-entity';
import { EntityState } from './entity-state';
import { type ComputedChanges } from './computed-changes';

export class ChangeTracker<E extends object> {
  private readonly identityMap = new WeakIdentityMap<
    unknown,
    TrackedEntity<E>
  >();

  public constructor(
    private readonly extractIdentity: (entity: E) => unknown,
  ) {}

  public trackNew(entity: E): void;
  public trackNew(entities: E[]): void;
  public trackNew(entityOrEntities: E | E[]): void {
    this.track(entityOrEntities, EntityState.NEW);
  }

  public trackLoaded(entity: E): void;
  public trackLoaded(entities: E[]): void;
  public trackLoaded(entityOrEntities: E | E[]): void {
    this.track(entityOrEntities, EntityState.LOADED);
  }

  public trackDeleted(entity: E): void;
  public trackDeleted(entities: E[]): void;
  public trackDeleted(entityOrEntities: E | E[]): void {
    this.track(entityOrEntities, EntityState.DELETED);
  }

  public untrack(entity: E): void;
  public untrack(entities: E[]): void;
  public untrack(entityOrEntities: E | E[]): void {
    const entities = Array.isArray(entityOrEntities)
      ? entityOrEntities
      : [entityOrEntities];

    for (const entity of entities) {
      const identity = this.extractIdentity(entity);
      this.identityMap.delete(identity);
    }
  }

  public compute(): ComputedChanges<E> {
    const created: E[] = [];
    const updated: E[] = [];
    const deleted: E[] = [];

    for (const trackedEntity of this.identityMap.values()) {
      if (trackedEntity.state === EntityState.NEW) {
        created.push(trackedEntity.ref);
      } else if (
        trackedEntity.state === EntityState.LOADED &&
        !trackedEntity.revalidate()
      ) {
        updated.push(trackedEntity.ref);
      } else if (trackedEntity.state === EntityState.DELETED) {
        deleted.push(trackedEntity.ref);
      }
    }

    return {
      created,
      updated,
      deleted,
    };
  }

  private track(entity: E | E[], state: EntityState) {
    const entities = Array.isArray(entity) ? entity : [entity];

    for (const entity of entities) {
      const identity = this.extractIdentity(entity);
      const trackedEntity = this.identityMap.get(identity);

      if (!trackedEntity) {
        this.identityMap.set(identity, new TrackedEntity(entity, state));
      } else {
        trackedEntity.state = state;
      }
    }
  }
}
