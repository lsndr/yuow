import { Broadcaster } from './broadcaster';
import type { Repository, RepositoryConstructor } from './repository';
import type { Transaction, TransactionEvents } from './transaction/transaction';
import type { InferTransactionEvents } from './transaction/utilts';

type InferEntity<R> = R extends Repository<infer E, any, any> ? E : never;

export interface ContextEvents<
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> {
  beforeFlush: Repository<any, T, TE>;
  afterFlush: Repository<any, T, TE>;
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
    for (const repository of this.repositories.values()) {
      await this.emit('beforeFlush', repository);

      await repository.flush();

      await this.emit('afterFlush', repository);
    }
  }
}
