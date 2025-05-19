import type { Repository, RepositoryConstructor } from './repository';
import type { Transaction, TransactionEvents } from './transaction/transaction';
import type { InferTransactionEvents } from './transaction/utilts';

type InferEntity<R> = R extends Repository<infer E, any, any> ? E : never;

export class Context<
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> {
  private readonly repositories = new Map<
    RepositoryConstructor<Repository<any, T, TE>, T, TE>,
    Repository<any, T, TE>
  >();

  public constructor(public readonly transaction: T) {}

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
      await repository.flush();
    }
  }
}
