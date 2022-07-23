import { DataMapper } from './data-mapper';
import { DBContext } from './db-context';
import { RepositoryConstructor } from './repository';
import { Transaction } from './transaction/transaction.interface';

export class Context {
  private readonly dbContext: DBContext;

  constructor(private readonly transaction: Transaction) {
    this.dbContext = new DBContext(this.transaction);
  }

  getRepository<E extends object, M extends DataMapper<E>>(
    constructor: RepositoryConstructor<E, M>,
  ) {
    return new constructor(this.dbContext);
  }

  async flush() {
    await this.transaction.flush();
  }

  get knex() {
    return this.transaction.knex;
  }
}
