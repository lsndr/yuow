import { DBContext } from './db-context';
import { Repository, RepositoryConstructor } from './repository';
import { Transaction, TransactionEvents } from './transaction/transaction';

export class Context<
  T extends Transaction<E>,
  E extends TransactionEvents = TransactionEvents,
> {
  private readonly dbContext: DBContext<T, E>;

  constructor(public readonly transaction: T) {
    this.dbContext = new DBContext(this.transaction);
  }

  getRepository<R extends Repository<any, T, E>>(
    constructor: RepositoryConstructor<R, T, E>,
  ): R {
    return new constructor(this.dbContext);
  }
}
