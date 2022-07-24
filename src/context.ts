import { DBContext } from './db-context';
import { Repository, RepositoryConstructor } from './repository';
import { Transaction } from './transaction/transaction.interface';

export class Context {
  private readonly dbContext: DBContext;

  constructor(private readonly transaction: Transaction) {
    this.dbContext = new DBContext(this.transaction);
  }

  getRepository<R extends Repository<any, any>>(
    constructor: RepositoryConstructor<R>,
  ): R {
    return new constructor(this.dbContext);
  }

  async flush() {
    await this.transaction.flush();
  }

  get knex() {
    return this.transaction.knex;
  }
}
