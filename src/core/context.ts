import type { AsyncEventEmitterEvents } from './async-event-emitter';
import { Broadcaster } from './broadcaster';
import type { Repository, RepositoryConstructor } from './repository';
import type {
  Transaction,
  TransactionEvents,
  InferTransactionEvents,
} from './transaction';

type InferEntity<R> = R extends Repository<infer E, any, any> ? E : never;

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
