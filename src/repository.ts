import { Knex } from 'knex';
import { WeakIdentityMap } from 'weak-identity-map';
import { DataMapper, DataMapperConstructor } from './data-mapper';
import { DBContext } from './db-context';
import { OptimisticError } from './transaction/optimistic.error';
import { serialize } from 'node:v8';
import * as EventEmitter from 'emittery';

type EntityState = 'created' | 'persisted' | 'deleted';

class EntityWrapper<E extends object> {
  public readonly entity: E;
  private snapshot: Buffer;
  public state: EntityState;

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

export type RepositoryConstructor<
  E extends object,
  M extends DataMapper<E>,
  S extends object,
> = new (context: DBContext<S>) => Repository<E, M, S>;

export type RepositoryEvents<E, S> = {
  flush: {
    entity: E;
    state: S;
  };
  inserted: {
    entity: E;
    state: S;
  };
  updated: {
    entity: E;
    state: S;
  };
  deleted: {
    entity: E;
    state: S;
  };
};
export abstract class Repository<
  E extends object,
  M extends DataMapper<E>,
  S extends object = object,
> {
  private eventEmitter: EventEmitter<RepositoryEvents<E, S>> =
    new EventEmitter();
  private identityMap: WeakIdentityMap<unknown, EntityWrapper<E>> =
    new WeakIdentityMap();

  protected abstract mapper: DataMapperConstructor<E, M>;

  protected abstract extractIdentity(entity: E): unknown;

  constructor(protected readonly context: DBContext<S>) {
    this.register();
  }

  async findOne(...args: Parameters<M['findOne']>): Promise<E | undefined> {
    const mapper = new this.mapper(this.context.knex);
    const entity = await mapper.findOne(...args);

    if (!entity) {
      return;
    }

    this.track(entity, 'persisted');

    return entity;
  }

  add(entity: E): boolean {
    return this.track(entity, 'created');
  }

  delete(entity: E) {
    return this.untrack(entity);
  }

  private async emit<Event extends keyof RepositoryEvents<E, S>>(
    event: Event,
    payload: RepositoryEvents<E, S>[Event],
  ): Promise<void> {
    await this.eventEmitter.emit(event, payload);
  }

  public on<Event extends keyof RepositoryEvents<E, S>>(
    event: Event,
    listener: (payload: RepositoryEvents<E, S>[Event]) => void | Promise<void>,
  ) {
    this.eventEmitter.on(event, listener);
  }

  public off<Event extends keyof RepositoryEvents<E, S>>(
    event: Event,
    listener: (payload: RepositoryEvents<E, S>[Event]) => void | Promise<void>,
  ) {
    this.eventEmitter.on(event, listener);
  }

  protected track(entity: E, state: EntityState): boolean {
    const identity = this.extractIdentity(entity);
    const trackedEntity = this.identityMap.get(identity);

    if (!trackedEntity) {
      this.identityMap.set(identity, new EntityWrapper(entity, state));

      return true;
    }

    return false;
  }

  protected untrack(entity: E): boolean {
    const identity = this.extractIdentity(entity);
    return this.identityMap.delete(identity);
  }

  private register() {
    this.context.on('flush', async ({ knex }) => {
      for (const [id, wrapper] of this.identityMap.entries()) {
        const identity = this.extractIdentity(wrapper.entity);

        const assertChange = async (action: () => Promise<boolean>) => {
          const isChanged = await action();

          if (!isChanged) {
            throw new OptimisticError(this.constructor.name, identity);
          }
        };

        if (wrapper.state === 'created') {
          await assertChange(() => this.insert(wrapper.entity, knex));
          wrapper.state = 'persisted';

          this.emit('inserted', {
            entity: wrapper.entity,
            state: this.context.state,
          }).catch(console.error);
        } else if (wrapper.state === 'persisted' && !wrapper.verify()) {
          await assertChange(() => this.update(wrapper.entity, knex));

          this.emit('updated', {
            entity: wrapper.entity,
            state: this.context.state,
          }).catch(console.error);
        } else if (wrapper.state === 'deleted') {
          await assertChange(() => this.remove(wrapper.entity, knex));

          this.identityMap.delete(id);

          this.emit('deleted', {
            entity: wrapper.entity,
            state: this.context.state,
          }).catch(console.error);
        }
      }
    });
  }

  private insert(entity: E, knex: Knex): Promise<boolean> {
    const mapper = new this.mapper(knex);

    return mapper.insert(entity);
  }

  private update(entity: E, knex: Knex): Promise<boolean> {
    const mapper = new this.mapper(knex);

    return mapper.update(entity);
  }

  private remove(entity: E, knex: Knex): Promise<boolean> {
    const mapper = new this.mapper(knex);

    return mapper.delete(entity);
  }
}
