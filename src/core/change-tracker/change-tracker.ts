import { TrackedEntity } from './tracked-entity';
import { EntityState } from './entity-state';
import { ComputedChanges } from './computed-changes';
import { IdentityMap } from './identity-map';

export class ChangeTracker<E extends object> {
  private readonly identityMap: IdentityMap<E>;

  public constructor(extractIdentity: (entity: E) => unknown) {
    this.identityMap = new IdentityMap(extractIdentity);
  }

  public isTracked(entity: E): false | EntityState {
    const trackedEntity = this.identityMap.get(entity);

    return !trackedEntity ? false : trackedEntity.state;
  }

  public track(entity: E, state: EntityState): void;
  public track(entities: E[], state: EntityState): void;
  public track(entityOrEntities: E | E[], state: EntityState): void {
    const entities = Array.isArray(entityOrEntities)
      ? entityOrEntities
      : [entityOrEntities];

    for (const entity of entities) {
      switch (state) {
        case EntityState.NEW:
          this.trackNew(entity);
          break;
        case EntityState.LOADED:
          this.trackLoaded(entity);
          break;
        case EntityState.DELETED:
          this.trackDeleted(entity);
          break;
      }
    }
  }

  public untrack(entity: E): void;
  public untrack(entities: E[]): void;
  public untrack(entityOrEntities: E | E[]): void {
    const entities = Array.isArray(entityOrEntities)
      ? entityOrEntities
      : [entityOrEntities];

    for (const entity of entities) {
      this.identityMap.delete(entity);
    }
  }

  public compute(): ComputedChanges<E> {
    const created: E[] = [];
    const updated: E[] = [];
    const deleted: E[] = [];
    const stale: E[] = [];

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
      } else {
        stale.push(trackedEntity.ref);
      }
    }

    return new ComputedChanges({
      created,
      updated,
      deleted,
      stale,
    });
  }

  private trackNew(entityOrEntities: E | E[]): void {
    const entities = Array.isArray(entityOrEntities)
      ? entityOrEntities
      : [entityOrEntities];

    for (const entity of entities) {
      const trackedEntity = this.identityMap.get(entity);

      if (!trackedEntity) {
        this.identityMap.put(new TrackedEntity(entity, EntityState.NEW));
      } else if (trackedEntity.state !== EntityState.NEW) {
        throw new Error(
          `Can not track entity as new because it is already ${trackedEntity.state}: ${JSON.stringify(entity)}`,
        );
      }
    }
  }

  private trackLoaded(entityOrEntities: E | E[]): void {
    const entities = Array.isArray(entityOrEntities)
      ? entityOrEntities
      : [entityOrEntities];

    for (const entity of entities) {
      const trackedEntity = this.identityMap.get(entity);

      if (!trackedEntity) {
        this.identityMap.put(new TrackedEntity(entity, EntityState.LOADED));
      } else {
        trackedEntity.state = EntityState.LOADED;
      }
    }
  }

  private trackDeleted(entityOrEntities: E | E[]): void {
    const entities = Array.isArray(entityOrEntities)
      ? entityOrEntities
      : [entityOrEntities];

    for (const entity of entities) {
      const trackedEntity = this.identityMap.get(entity);

      if (!trackedEntity) {
        throw new Error(
          `Can not track untracked entity as deleted: ${JSON.stringify(entity)}`,
        );
      } else if (trackedEntity.state === EntityState.NEW) {
        this.identityMap.delete(entity);
      } else {
        trackedEntity.state = EntityState.DELETED;
      }
    }
  }
}
