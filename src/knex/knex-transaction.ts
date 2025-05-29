import { Transaction } from '../core';
import type { Knex } from 'knex';

export interface KnexTransactionOptions {
  readonly global?: boolean;
  readonly isolationLevel?: Knex.IsolationLevels;
}

export class KnexTransaction extends Transaction {
  private readonly _knex: Knex;
  private trx?: Knex.Transaction;

  public get knex(): Knex {
    const knex = this.trx ?? this._knex;

    return knex;
  }

  public constructor(
    knex: Knex | Knex.Transaction,
    public readonly options?: KnexTransactionOptions,
  ) {
    super();

    this._knex = knex;
  }

  protected async doBegin(): Promise<void> {
    if (this.trx) {
      throw new Error('Transaction already intialized');
    }

    this.trx = await this.knex.transaction({
      isolationLevel: this.options?.isolationLevel,
    });
  }

  protected async doCommit(): Promise<void> {
    if (!this.trx) {
      throw new Error('Transaction not intialized');
    }

    await this.trx.commit();
  }

  protected async doRollback(): Promise<void> {
    if (this.trx) {
      await this.trx.rollback();
    }
  }
}
