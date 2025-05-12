import { DBContext } from './db-context';
import { Repository, RepositoryConstructor } from './repository';
import { Transaction, TransactionEvents } from './transaction/transaction';

export class Context<
  T extends Transaction<O, E>,
  O = undefined,
  E extends TransactionEvents = TransactionEvents,
> {
  private readonly dbContext: DBContext<T, O, E>;

  constructor(public readonly transaction: T) {
    this.dbContext = new DBContext(this.transaction);
  }

  getRepository<R extends Repository<any, T, O, E>>(
    constructor: RepositoryConstructor<R, T, O, E>,
  ): R {
    return new constructor(this.dbContext);
  }
}
