import { WeakIdentityMap } from 'weak-identity-map';
import type { PersistenceOperation } from './persistence.error';
import { PersistenceError } from './persistence.error';
import {
  TransactionState,
  type Transaction,
  type TransactionEvents,
} from './transaction/transaction';
import { EntityWrapper } from './entity-wrapper';
import { EntityState } from './entity-state';
import type { InferTransactionEvents } from './transaction/utilts';

export interface RepositoryConstructor<
  R,
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
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
  TE extends TransactionEvents = InferTransactionEvents<T>,
> {
  protected readonly transaction: T;
  private identityMap = new WeakIdentityMap<unknown, EntityWrapper<E>>();

  public constructor(transaction: T) {
    this.transaction = transaction;
  }

  protected abstract extractIdentity(entity: E): unknown;

  protected abstract doUpdate(entity: E): Promise<boolean>;

  protected abstract doDelete(entity: E): Promise<boolean>;

  protected abstract doInsert(entity: E): Promise<boolean>;

  public add(entity: E): boolean {
    return this.track(entity, EntityState.ADDED) === entity;
  }

  public delete(entity: E): boolean {
    return this.track(entity, EntityState.DELETED) === entity;
  }

  public async flush(): Promise<void> {
    if (this.transaction.state !== TransactionState.BEGUN) {
      await this.transaction.begin();
    }

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
        await assertChange(() => this.doInsert(wrapper.entity), 'insert');
        wrapper.state = EntityState.LOADED;
      } else if (wrapper.state === EntityState.LOADED && !wrapper.verify()) {
        await assertChange(async () => this.doUpdate(wrapper.entity), 'update');
      } else if (wrapper.state === EntityState.DELETED) {
        await assertChange(() => this.doDelete(wrapper.entity), 'delete');

        this.identityMap.delete(id);
      }
    }
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
}
