import { Repository, RepositoryConstructor } from './repository';
import { Transaction, TransactionEvents } from './transaction/transaction';

export class Context<
  T extends Transaction<E>,
  E extends TransactionEvents = TransactionEvents,
> {
  constructor(public readonly transaction: T) {}

  getRepository<R extends Repository<any, T, E>>(
    constructor: RepositoryConstructor<R, T, E>,
  ): R {
    return new constructor(this.transaction);
  }
}
