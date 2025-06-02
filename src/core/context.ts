import type { AsyncEventEmitterEvents } from './async-event-emitter';
import { Broadcaster } from './broadcaster';
import { ContextProvider } from './context-provider';
import type { Repository, RepositoryConstructor } from './repository';
import type {
  Transaction,
  TransactionEvents,
  InferTransactionEvents,
} from './transaction';

type InferEntity<R> = R extends Repository<infer E, any, any> ? E : never;
type InferRepositoryEntity<R> =
  R extends Repository<infer E, any, any> ? E : never;
type InferRepositoryTransaction<R> =
  R extends Repository<any, infer T, any> ? T : never;
type InferContextTransaction<C> =
  C extends Context<infer T, any> ? T : Transaction;

export interface ContextEvents<
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> extends AsyncEventEmitterEvents {
  beforeFlush: [];
  afterFlush: [];
}

export class Context<
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> extends Broadcaster<ContextEvents<T, TE>> {
  public readonly transaction: T;
  private readonly repositories: Map<
    RepositoryConstructor<Repository<any, T, TE>, T, TE>,
    Repository<any, T, TE>
  >;

  public constructor(transaction: T) {
    super();

    this.transaction = transaction;
    this.repositories = new Map();
  }

  public static get<
    C extends Context<T, TE>,
    T extends Transaction<TE> = InferContextTransaction<C>,
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
    E extends object = InferEntity<R>,
  >(constructor: RepositoryConstructor<R, T, TE>): R {
    let repository = this.repositories.get(constructor);

    if (!repository) {
      repository = new constructor(this.transaction);
      this.repositories.set(constructor, repository);
    }

    return repository as R;
  }

  public async flush(): Promise<void> {
    await this.emit('beforeFlush');

    for (const repository of this.repositories.values()) {
      await repository.flush();
    }

    await this.emit('afterFlush');
  }
}
