import { Transaction } from '../core/transaction/transaction';
import { Knex } from 'knex';

export interface KnexTransactionOptions {
  readonly global?: boolean;
  readonly isolationLevel?: Knex.IsolationLevels;
}

export class KnexTransaction extends Transaction {
  constructor(
    public readonly knex: Knex.Transaction,
    public readonly options?: KnexTransactionOptions,
  ) {
    super();
  }

  async commit() {
    await this.knex.commit();
  }

  async rollback() {
    await this.knex.rollback();
  }
}
