import { PersistenceError } from './persistence.error';
import {
  TransactionState,
  type Transaction,
  type TransactionEvents,
} from './transaction/transaction';
import type { InferTransactionEvents } from './transaction/utilts';
import { ChangeTracker } from './change-tracker/change-tracker';
import {
  AsyncEventEmitter,
  type AsyncEventEmitterHandler,
} from './async-event-emitter';
import { EntityState } from './change-tracker/entity-state';

export interface RepositoryConstructor<
  R,
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> {
  new (transaction: T): R;
}

export type RepositoryEvents<E extends object> = {
  beforeFlsuh: ChangeTracker<E>;
  afterFlush: ChangeTracker<E>;
};

export abstract class Repository<
  E extends object,
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> {
  protected readonly transaction: T;
  protected readonly changeTracker: ChangeTracker<E>;
  private readonly eventEmitter: AsyncEventEmitter<RepositoryEvents<E>>;

  public constructor(transaction: T) {
    this.transaction = transaction;
    this.changeTracker = new ChangeTracker<E>((entity: E) =>
      this.extractIdentity(entity),
    );
    this.eventEmitter = new AsyncEventEmitter();
  }

  protected abstract extractIdentity(entity: E): unknown;

  protected abstract doUpdate(entity: E): Promise<boolean>;

  protected abstract doDelete(entity: E): Promise<boolean>;

  protected abstract doInsert(entity: E): Promise<boolean>;

  public on<M extends keyof RepositoryEvents<E>>(
    event: M,
    listener: AsyncEventEmitterHandler<RepositoryEvents<E>[M]>,
  ): void {
    this.eventEmitter.on(event, listener);
  }

  public off<M extends keyof RepositoryEvents<E>>(
    event: M,
    listener: AsyncEventEmitterHandler<RepositoryEvents<E>[M]>,
  ): void {
    this.eventEmitter.off(event, listener);
  }

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

    await this.eventEmitter.emit('beforeFlsuh', this.changeTracker);

    const changes = this.changeTracker.compute();

    await this.flushInserts(changes.created);
    await this.flushUpdates(changes.updated);
    await this.flushDeletes(changes.deleted);

    this.changeTracker.track(changes.created, EntityState.LOADED);
    this.changeTracker.untrack(changes.deleted);

    await this.eventEmitter.emit('afterFlush', this.changeTracker);
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
