import type { Knex } from 'knex';
import type { Engine } from '../../../src/core';
import type { KnexTransactionOptions } from './knex.transaction';
import { KnexTransaction } from './knex.transaction';

export class KnexEngine
  implements Engine<KnexTransaction, KnexTransactionOptions>
{
  public constructor(private readonly knex: Knex) {}

  public async createTransaction(
    options: KnexTransactionOptions,
  ): Promise<KnexTransaction> {
    return await KnexTransaction.create(this.knex, options);
  }
}
