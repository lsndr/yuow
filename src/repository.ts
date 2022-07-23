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
> = new (context: DBContext) => Repository<E, M>;

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
export abstract class Repository<E extends object, M extends DataMapper<E>> {
  private eventEmitter: EventEmitter<RepositoryEvents<E>> = new EventEmitter();
  private identityMap: WeakIdentityMap<unknown, EntityWrapper<E>> =
    new WeakIdentityMap();

  protected abstract mapper: DataMapperConstructor<E, M>;

  protected abstract extractIdentity(entity: E): unknown;

  constructor(protected readonly context: DBContext) {
    this.register();
  }

  async findOne(...args: Parameters<M['findOne']>): Promise<E | undefined> {
    const mapper = new this.mapper(this.context.knex);
    const entity = await mapper.findOne(...args);

    if (!entity) {
      return;
    }

    return this.track(entity, 'persisted');
  }

  add(entity: E): boolean {
    return this.track(entity, 'created') === entity;
  }

  delete(entity: E) {
    return this.untrack(entity);
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
          }).catch(console.error);
        } else if (wrapper.state === 'persisted' && !wrapper.verify()) {
          await assertChange(() => this.update(wrapper.entity, knex));

          this.emit('updated', {
            entity: wrapper.entity,
          }).catch(console.error);
        } else if (wrapper.state === 'deleted') {
          await assertChange(() => this.remove(wrapper.entity, knex));

          this.identityMap.delete(id);

          this.emit('deleted', {
            entity: wrapper.entity,
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
