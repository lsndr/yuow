import type { Repository, RepositoryConstructor } from './repository';
import type { Transaction, TransactionEvents } from './transaction/transaction';

export class Context<
  T extends Transaction<E>,
  E extends TransactionEvents = TransactionEvents,
> {
  public constructor(public readonly transaction: T) {}

  public getRepository<R extends Repository<any, T, E>>(
    constructor: RepositoryConstructor<R, T, E>,
  ): R {
    return new constructor(this.transaction);
  }
}
