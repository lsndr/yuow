import * as EventEmitter from 'emittery';
import { WeakIdentityMap } from 'weak-identity-map';
import type { PersistenceOperation } from './persistence.error';
import { PersistenceError } from './persistence.error';
import type { Transaction, TransactionEvents } from './transaction/transaction';
import { EntityWrapper } from './entity-wrapper';
import { EntityState } from './entity-state';

export interface RepositoryConstructor<
  R,
  T extends Transaction<TE>,
  TE extends TransactionEvents,
> {
  new (transaction: T): R;
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
  TE extends TransactionEvents,
> {
  protected readonly transaction: T;

  private eventEmitter: EventEmitter<RepositoryEvents<E>> = new EventEmitter();
  private identityMap: WeakIdentityMap<unknown, EntityWrapper<E>> =
    new WeakIdentityMap();

  public constructor(transaction: T) {
    this.transaction = transaction;

    this.register();
  }

  protected abstract extractIdentity(entity: E): unknown;

  protected abstract update(entity: E): Promise<boolean>;

  protected abstract remove(entity: E): Promise<boolean>;

  protected abstract insert(entity: E): Promise<boolean>;

  public add(entity: E): boolean {
    return this.track(entity, EntityState.ADDED) === entity;
  }

  public delete(entity: E): boolean {
    return this.track(entity, EntityState.DELETED) === entity;
  }

  protected trackAll<P extends E | undefined>(
    entity: P,
    state: EntityState,
  ): E | undefined;
  protected trackAll<P extends E[]>(entities: P, state: EntityState): E[];
  protected trackAll(
    entities: E | E[] | undefined,
    state: EntityState,
  ): E | E[] | undefined {
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
  ): void {
    this.eventEmitter.on(event, listener);
  }

  protected off<Event extends keyof RepositoryEvents<E>>(
    event: Event,
    listener: (payload: RepositoryEvents<E>[Event]) => void | Promise<void>,
  ): void {
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
    this.transaction.on('flush', async () => {
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

        if (wrapper.state === EntityState.ADDED) {
          await assertChange(() => this.insert(wrapper.entity), 'insert');
          wrapper.state = EntityState.LOADED;

          this.emit('inserted', {
            entity: wrapper.entity,
          }).catch(console.error);
        } else if (wrapper.state === EntityState.LOADED && !wrapper.verify()) {
          await assertChange(async () => this.update(wrapper.entity), 'update');

          this.emit('updated', {
            entity: wrapper.entity,
          }).catch(console.error);
        } else if (wrapper.state === EntityState.DELETED) {
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
