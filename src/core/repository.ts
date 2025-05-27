import { PersistenceError } from './persistence.error';
import {
  TransactionState,
  type Transaction,
  type TransactionEvents,
  type InferTransactionEvents,
} from './transaction';
import { ChangeTracker, EntityState } from './change-tracker';
import { Broadcaster } from './broadcaster';
import type { AsyncEventEmitterEvents } from './async-event-emitter';

export type RepositoryConstructor<
  R,
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> = new (transaction: T) => R;

export interface RepositoryEvents<E extends object>
  extends AsyncEventEmitterEvents {
  beforeFlush: [ChangeTracker<E>];
  afterFlush: [ChangeTracker<E>];
}

export abstract class Repository<
  E extends object,
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> extends Broadcaster<RepositoryEvents<E>> {
  protected readonly transaction: T;
  protected readonly changeTracker: ChangeTracker<E>;

  public constructor(transaction: T) {
    super();

    this.transaction = transaction;
    this.changeTracker = new ChangeTracker<E>((entity: E) =>
      this.extractIdentity(entity),
    );
  }

  protected abstract extractIdentity(entity: E): unknown;

  protected abstract doUpdate(entity: E): Promise<boolean>;

  protected abstract doDelete(entity: E): Promise<boolean>;

  protected abstract doInsert(entity: E): Promise<boolean>;

  public add(entity: E): void {
    if (
      [false, EntityState.NEW].includes(this.changeTracker.isTracked(entity))
    ) {
      this.changeTracker.track(entity, EntityState.NEW);
    } else {
      this.changeTracker.track(entity, EntityState.LOADED);
    }
  }

  public delete(entity: E): void {
    this.changeTracker.track(entity, EntityState.DELETED);
  }

  public async flush(): Promise<void> {
    if (this.transaction.state !== TransactionState.BEGUN) {
      await this.transaction.begin();
    }

    await this.emit('beforeFlush', this.changeTracker);

    const changes = this.changeTracker.compute();

    await this.flushInserts(changes.created);
    await this.flushUpdates(changes.updated);
    await this.flushDeletes(changes.deleted);

    this.changeTracker.track(changes.created, EntityState.LOADED);
    this.changeTracker.untrack(changes.deleted);

    await this.emit('afterFlush', this.changeTracker);
  }

  private async flushInserts(entities: E[]): Promise<void> {
    for (const entity of entities) {
      const result = await this.doInsert(entity);

      if (!result) {
        throw new PersistenceError(
          this.constructor.name,
          this.extractIdentity(entity),
          'insert',
        );
      }
    }
  }

  private async flushUpdates(entities: E[]): Promise<void> {
    for (const entity of entities) {
      const result = await this.doUpdate(entity);

      if (!result) {
        throw new PersistenceError(
          this.constructor.name,
          this.extractIdentity(entity),
          'update',
        );
      }
    }
  }

  private async flushDeletes(entities: E[]): Promise<void> {
    for (const entity of entities) {
      const result = await this.doDelete(entity);

      if (!result) {
        throw new PersistenceError(
          this.constructor.name,
          this.extractIdentity(entity),
          'delete',
        );
      }
    }
  }
}
