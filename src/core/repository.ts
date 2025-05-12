import { WeakIdentityMap } from 'weak-identity-map';
import { DBContext } from './db-context';
import { PersistenceError, PersistenceOperation } from './persistence.error';
import { serialize } from 'node:v8';
import * as EventEmitter from 'emittery';
import { Transaction, TransactionEvents } from './transaction/transaction';

type EntityState = 'added' | 'loaded' | 'deleted';

class EntityWrapper<E extends object> {
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

export interface RepositoryConstructor<
  R,
  T extends Transaction<TE>,
  TE extends TransactionEvents = TransactionEvents,
> {
  new (context: DBContext<T, TE>): R;
}

export type RepositoryEvents<E> = {
  flush: {
    entity: E;
  };
  inserted: {
    entity: E;
  };
  updated: {
    entity: E;
  };
  deleted: {
    entity: E;
  };
};

export abstract class Repository<
  E extends object,
  T extends Transaction<TE>,
  TE extends TransactionEvents = TransactionEvents,
> {
  private eventEmitter: EventEmitter<RepositoryEvents<E>> = new EventEmitter();
  private identityMap: WeakIdentityMap<unknown, EntityWrapper<E>> =
    new WeakIdentityMap();

  protected readonly context: DBContext<T, TE>;

  protected abstract extractIdentity(entity: E): unknown;

  protected abstract update(entity: E): Promise<boolean>;

  protected abstract remove(entity: E): Promise<boolean>;

  protected abstract insert(entity: E): Promise<boolean>;

  constructor(context: DBContext<T, TE>) {
    this.context = context;

    this.register();
  }

  add(entity: E): boolean {
    return this.track(entity, 'added') === entity;
  }

  delete(entity: E) {
    return this.track(entity, 'deleted') === entity;
  }

  protected trackAll<P extends E | undefined>(
    entity: P,
    state: EntityState,
  ): E | undefined;
  protected trackAll<P extends E[]>(entities: P, state: EntityState): E[];
  protected trackAll(entities: E | E[] | undefined, state: EntityState) {
    if (typeof entities === 'undefined') {
      return entities;
    } else if (Array.isArray(entities)) {
      return entities.map((entity) => this.track(entity, state));
    } else {
      return this.track(entities, state);
    }
  }

  protected untrack(entity: E): boolean {
    const identity = this.extractIdentity(entity);
    return this.identityMap.delete(identity);
  }

  protected on<Event extends keyof RepositoryEvents<E>>(
    event: Event,
    listener: (payload: RepositoryEvents<E>[Event]) => void | Promise<void>,
  ) {
    this.eventEmitter.on(event, listener);
  }

  protected off<Event extends keyof RepositoryEvents<E>>(
    event: Event,
    listener: (payload: RepositoryEvents<E>[Event]) => void | Promise<void>,
  ) {
    this.eventEmitter.on(event, listener);
  }

  protected track(entity: E, state: EntityState): E {
    const identity = this.extractIdentity(entity);
    const trackedEntity = this.identityMap.get(identity);

    if (!trackedEntity) {
      this.identityMap.set(identity, new EntityWrapper(entity, state));

      return entity;
    } else {
      trackedEntity.state = state;
    }

    return trackedEntity.entity;
  }

  private async emit<Event extends keyof RepositoryEvents<E>>(
    event: Event,
    payload: RepositoryEvents<E>[Event],
  ): Promise<void> {
    await this.eventEmitter.emit(event, payload);
  }

  private register() {
    this.context.transaction.on('flush', async () => {
      for (const [id, wrapper] of this.identityMap.entries()) {
        const identity = this.extractIdentity(wrapper.entity);

        const assertChange = async (
          action: () => Promise<boolean>,
          operation: PersistenceOperation,
        ) => {
          const isChanged = await action();

          if (!isChanged) {
            throw new PersistenceError(
              this.constructor.name,
              identity,
              operation,
            );
          }
        };

        if (wrapper.state === 'added') {
          await assertChange(() => this.insert(wrapper.entity), 'insert');
          wrapper.state = 'loaded';

          this.emit('inserted', {
            entity: wrapper.entity,
          }).catch(console.error);
        } else if (wrapper.state === 'loaded' && !wrapper.verify()) {
          await assertChange(() => this.update(wrapper.entity), 'update');

          this.emit('updated', {
            entity: wrapper.entity,
          }).catch(console.error);
        } else if (wrapper.state === 'deleted') {
          await assertChange(() => this.remove(wrapper.entity), 'delete');

          this.identityMap.delete(id);

          this.emit('deleted', {
            entity: wrapper.entity,
          }).catch(console.error);
        }
      }
    });
  }
}
