import { Knex } from 'knex';
import { WeakIdentityMap } from 'weak-identity-map';
import { DataMapper, DataMapperConstructor } from './data-mapper';
import { DBContext } from './db-context';
import {
  PersistenceError,
  PersistenceOperation,
} from './transaction/persistence.error';
import { serialize } from 'node:v8';
import * as EventEmitter from 'emittery';

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

export interface RepositoryConstructor<R> {
  new (context: DBContext): R;
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

export const RepositoryDataMapper: unique symbol = Symbol(
  'Repository.DataMapper',
);

export abstract class Repository<E extends object, M extends DataMapper<E>> {
  public static readonly DataMapper: typeof RepositoryDataMapper =
    RepositoryDataMapper;
  private eventEmitter: EventEmitter<RepositoryEvents<E>> = new EventEmitter();
  private identityMap: WeakIdentityMap<unknown, EntityWrapper<E>> =
    new WeakIdentityMap();
  protected abstract readonly [RepositoryDataMapper]: DataMapperConstructor<
    E,
    M
  >;
  protected abstract extractIdentity(entity: E): unknown;
  protected readonly context: DBContext;
  private mapperInstance?: M;

  protected get mapper() {
    if (!this.mapperInstance) {
      this.mapperInstance = new this[RepositoryDataMapper](this.context.knex);
    }

    return this.mapperInstance;
  }

  constructor(context: DBContext) {
    this.context = context;

    this.register();
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

  add(entity: E): boolean {
    return this.track(entity, 'added') === entity;
  }

  delete(entity: E) {
    return this.track(entity, 'deleted') === entity;
  }

  private async emit<Event extends keyof RepositoryEvents<E>>(
    event: Event,
    payload: RepositoryEvents<E>[Event],
  ): Promise<void> {
    await this.eventEmitter.emit(event, payload);
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

  protected untrack(entity: E): boolean {
    const identity = this.extractIdentity(entity);
    return this.identityMap.delete(identity);
  }

  private register() {
    this.context.on('flush', async ({ knex }) => {
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
          await assertChange(() => this.insert(wrapper.entity, knex), 'insert');
          wrapper.state = 'loaded';

          this.emit('inserted', {
            entity: wrapper.entity,
          }).catch(console.error);
        } else if (wrapper.state === 'loaded' && !wrapper.verify()) {
          await assertChange(() => this.update(wrapper.entity, knex), 'update');

          this.emit('updated', {
            entity: wrapper.entity,
          }).catch(console.error);
        } else if (wrapper.state === 'deleted') {
          await assertChange(() => this.remove(wrapper.entity, knex), 'delete');

          this.identityMap.delete(id);

          this.emit('deleted', {
            entity: wrapper.entity,
          }).catch(console.error);
        }
      }
    });
  }

  private insert(entity: E, knex: Knex): Promise<boolean> {
    const mapper = new this[RepositoryDataMapper](knex);

    return mapper.insert(entity);
  }

  private update(entity: E, knex: Knex): Promise<boolean> {
    const mapper = new this[RepositoryDataMapper](knex);

    return mapper.update(entity);
  }

  private remove(entity: E, knex: Knex): Promise<boolean> {
    const mapper = new this[RepositoryDataMapper](knex);

    return mapper.delete(entity);
  }
}
