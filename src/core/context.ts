import {
  AsyncEventEmitter,
  type AsyncEventEmitterHandler,
} from './async-event-emitter';
import { ContextProvider } from './context-provider';
import type { Repository, RepositoryConstructor } from './repository';
import type { Transaction, TransactionEvents } from './transaction/transaction';
import type { InferTransactionEvents } from './transaction/utilts';

type InferRepositoryEntity<R> =
  R extends Repository<infer E, any, any> ? E : never;
type InferRepositoryTransaction<R> =
  R extends Repository<any, infer T, any> ? T : never;
type InferContextTransaction<C, D = never> = C extends Context<infer T, any> ? T : D;

export interface ContextEvents<
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> {
  beforeFlush: Repository<any, T, TE>;
  afterFlush: Repository<any, T, TE>;
  repository: Repository<any, T, TE>;
}

export class Context<
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> {
  public readonly transaction: T;
  private readonly eventEmitter: AsyncEventEmitter<ContextEvents<T, TE>>;
  private readonly repositories: Map<
    RepositoryConstructor<Repository<any, T, TE>, T, TE>,
    Repository<any, T, TE>
  >;

  public constructor(transaction: T) {
    this.transaction = transaction;
    this.repositories = new Map();
    this.eventEmitter = new AsyncEventEmitter();
  }

  public static get<
    C extends Context<T, TE>,
    T extends Transaction<TE> = InferContextTransaction<C, Transaction>,
    TE extends TransactionEvents = InferTransactionEvents<T>,
  >(): Context<T, TE> {
    return ContextProvider.get<C>();
  }

  public static async flush(): Promise<void> {
    await ContextProvider.get<Context<Transaction>>().flush();
  }

  public static getRepository<
    R extends Repository<E, T, TE>,
    E extends object = InferRepositoryEntity<R>,
    T extends Transaction<TE> = InferRepositoryTransaction<R>,
    TE extends TransactionEvents = InferTransactionEvents<T>,
  >(constructor: RepositoryConstructor<R, T, TE>): R {
    const context = ContextProvider.get<Context<T, TE>>();

    return context.getRepository<R, E>(constructor);
  }

  public getRepository<
    R extends Repository<E, T, TE>,
    E extends object = InferRepositoryEntity<R>,
  >(constructor: RepositoryConstructor<R, T, TE>): R {
    let repository = this.repositories.get(constructor);

    if (!repository) {
      repository = new constructor(this.transaction);
      this.repositories.set(constructor, repository);
    }

    return repository as R;
  }

  public async flush(): Promise<void> {
    for (const repository of this.repositories.values()) {
      await this.eventEmitter.emit('beforeFlush', repository);

      await repository.flush();

      await this.eventEmitter.emit('afterFlush', repository);
    }
  }

  public on<E extends keyof ContextEvents<T, TE>>(
    event: E,
    listener: AsyncEventEmitterHandler<ContextEvents<T, TE>[E]>,
  ): void {
    this.eventEmitter.on(event, listener);
  }

  public off<E extends keyof ContextEvents<T, TE>>(
    event: E,
    listener: AsyncEventEmitterHandler<ContextEvents<T, TE>[E]>,
  ): void {
    this.eventEmitter.off(event, listener);
  }
}
