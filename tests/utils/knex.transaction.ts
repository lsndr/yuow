import { Transaction } from '../../src';
import { Knex } from 'knex';

export interface KnexTransactionOptions {
  global?: boolean;
  isolationLevel?: Knex.IsolationLevels;
}

export class KnexTransaction extends Transaction<KnexTransactionOptions> {
  constructor(
    public readonly knex: Knex.Transaction,
    options?: KnexTransactionOptions,
  ) {
    super(options ?? {});
  }

  async commit() {
    await this.knex.commit();
  }

  async rollback() {
    await this.knex.rollback();
  }
}
