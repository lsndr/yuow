import { WeakIdentityMap } from 'weak-identity-map';
import { type TrackedEntity } from './tracked-entity';

export class IdentityMap<E extends object> {
  private readonly identityMap = new WeakIdentityMap<
    unknown,
    TrackedEntity<E>
  >();

  public constructor(
    private readonly extractIdentity: (entity: E) => unknown,
  ) {}

  public get(entity: E): TrackedEntity<E> | undefined {
    const identity = this.extractIdentity(entity);
    const trackedEntity = this.identityMap.get(identity);

    if (!trackedEntity) {
      return;
    }

    if (entity !== trackedEntity.ref) {
      throw new Error(
        `Different entities have the same identity. \r\n\r\nEntity: \r\n${JSON.stringify(entity)}\r\nTracked Entity:\r\n${JSON.stringify(trackedEntity.ref)}`,
      );
    }

    return trackedEntity;
  }

  public put(trackedEntity: TrackedEntity<E>): void {
    const identity = this.extractIdentity(trackedEntity.ref);

    if (this.identityMap.has(identity)) {
      throw new Error('Entity already exists in the identity map');
    }

    this.identityMap.set(identity, trackedEntity);
  }

  public delete(entity: E): void {
    const identity = this.extractIdentity(entity);

    this.identityMap.delete(identity);
  }

  public values(): IterableIterator<TrackedEntity<E>> {
    return this.identityMap.values();
  }
}
