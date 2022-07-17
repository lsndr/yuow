import { DataMapper } from './data-mapper';
import { DBContext } from './db-context';
import { RepositoryConstructor } from './repository';
import { Transaction } from './transaction/transaction.interface';

export class Context {
  private readonly dbContext: DBContext<any>;

  constructor(private readonly transaction: Transaction<any>) {
    this.dbContext = new DBContext(this.transaction);
  }

  getRepository<E extends object, S extends object>(
    constructor: RepositoryConstructor<E, DataMapper<E>, S>,
  ) {
    return new constructor(this.dbContext);
  }

  get knex() {
    return this.transaction.knex;
  }
}
