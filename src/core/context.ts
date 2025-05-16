import type { Repository, RepositoryConstructor } from './repository';
import type { Transaction, TransactionEvents } from './transaction/transaction';
import type { InferTransactionEvents } from './transaction/utilts';

type InferEntity<R> = R extends Repository<infer E, any, any> ? E : never;

export class Context<
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> {
  public constructor(public readonly transaction: T) {}

  public getRepository<
    R extends Repository<E, T, TE>,
    E extends object = InferEntity<R>,
  >(constructor: RepositoryConstructor<R, T, TE>): R {
    return new constructor(this.transaction);
  }
}
