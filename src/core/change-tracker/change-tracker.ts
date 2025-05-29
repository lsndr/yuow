import { ComputedChanges } from './computed-changes';
import { EntityState } from './entity-state';
import { TrackedEntity } from './tracked-entity';
import { WeakIdentityMap } from 'weak-identity-map';

export class ChangeTracker<E extends object> {
  private readonly identityMap = new WeakIdentityMap<
    unknown,
    TrackedEntity<E>
  >();

  public constructor(
    private readonly extractIdentity: (entity: E) => unknown,
  ) {}

  public isTracked(entity: E): false | EntityState {
    const trackedEntity = this.identityMap.get(this.extractIdentity(entity));

    return !trackedEntity ? false : trackedEntity.state;
  }

  public getTracked(entity: E): E {
    const identity = this.extractIdentity(entity);
    const trackedEntity = this.identityMap.get(identity);

    if (!trackedEntity) {
      throw new Error(`Entity is not tracked: ${JSON.stringify(entity)}`);
    }

    return trackedEntity.ref;
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
      this.identityMap.delete(this.extractIdentity(entity));
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
      const identity = this.extractIdentity(entity);
      const trackedEntity = this.identityMap.get(identity);

      if (!trackedEntity) {
        this.identityMap.set(
          identity,
          new TrackedEntity(entity, EntityState.NEW),
        );
      } else if (trackedEntity.state !== EntityState.NEW) {
        throw new Error(
          `Can not track entity as ${EntityState.NEW} because it is already in ${trackedEntity.state} state: ${JSON.stringify(entity)}`,
        );
      } else if (trackedEntity.ref !== entity) {
        throw new Error(
          `Can not track entity as ${EntityState.NEW} because there is already tracked entity with similar identity.\r\n\r\nNew entity: ${JSON.stringify(entity)}\r\nTracked entity: ${JSON.stringify(trackedEntity.ref)}`,
        );
      }
    }
  }

  private trackLoaded(entityOrEntities: E | E[]): void {
    const entities = Array.isArray(entityOrEntities)
      ? entityOrEntities
      : [entityOrEntities];

    for (const entity of entities) {
      const identity = this.extractIdentity(entity);
      const trackedEntity = this.identityMap.get(identity);

      if (!trackedEntity) {
        this.identityMap.set(
          identity,
          new TrackedEntity(entity, EntityState.LOADED),
        );
      } else if (trackedEntity.ref !== entity) {
        throw new Error(
          `Can not track entity as ${EntityState.LOADED} because there is already tracked entity with similar identity.\r\n\r\nNew entity: ${JSON.stringify(entity)}\r\nTracked entity: ${JSON.stringify(trackedEntity.ref)}`,
        );
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
      const identity = this.extractIdentity(entity);
      const trackedEntity = this.identityMap.get(identity);

      if (!trackedEntity) {
        throw new Error(
          `Can not track untracked entity as ${EntityState.DELETED}: ${JSON.stringify(entity)}`,
        );
      } else if (trackedEntity.ref !== entity) {
        throw new Error(
          `Can not track entity as ${EntityState.DELETED} because there is already tracked entity with similar identity.\r\n\r\nNew entity: ${JSON.stringify(entity)}\r\nTracked entity: ${JSON.stringify(trackedEntity.ref)}`,
        );
      } else if (trackedEntity.state === EntityState.NEW) {
        this.identityMap.delete(identity);
      } else {
        trackedEntity.state = EntityState.DELETED;
      }
    }
  }
}
