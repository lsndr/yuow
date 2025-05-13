import { Transaction } from '../core';
import { Knex } from 'knex';

export interface KnexTransactionOptions {
  readonly global?: boolean;
  readonly isolationLevel?: Knex.IsolationLevels;
}

export class KnexTransaction extends Transaction {
  private _knex?: Knex;
  private trx?: Knex.Transaction;

  public get knex(): Knex {
    const knex = this.trx ?? this._knex;

    if (!knex) {
      throw new Error('Knex instance not initiated');
    }

    return knex;
  }

  private constructor(
    knexOrTrx: Knex | Knex.Transaction,
    public readonly options?: KnexTransactionOptions,
  ) {
    super();

    if ('commit' in knexOrTrx) {
      this.trx = knexOrTrx;
    } else {
      this._knex = knexOrTrx;
    }
  }

  override async flush() {
    if (!this.trx && !this.options?.global) {
      this.trx = await this.knex.transaction({
        isolationLevel: this.options?.isolationLevel,
      });
    }

    await super.flush();
  }

  async commit() {
    if (!this.trx) {
      throw new Error('Transaction not initi');
    }

    await this.trx.commit();

    if (!this.options?.global) {
      this.trx = undefined;
    }
  }

  async rollback() {
    if (this.trx) {
      await this.trx.rollback();
    }

    if (!this.options?.global) {
      this.trx = undefined;
    }
  }

  static async create(knex: Knex, options?: KnexTransactionOptions) {
    const trx = options?.global
      ? await knex.transaction({
          isolationLevel: options.isolationLevel,
        })
      : knex;

    return new KnexTransaction(trx, options);
  }
}
