import type { Knex } from 'knex';
import type { Engine, TransactionEvents } from '../../../src/core';
import type { KnexTransactionOptions } from './knex.transaction';
import { KnexTransaction } from './knex.transaction';

export class KnexEngine
  implements Engine<KnexTransaction, KnexTransactionOptions, TransactionEvents>
{
  public constructor(private readonly knex: Knex) {}

  public async createTransaction(
    options: KnexTransactionOptions,
  ): Promise<KnexTransaction> {
    return await KnexTransaction.create(this.knex, options);
  }
}
