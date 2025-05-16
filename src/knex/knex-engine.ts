import type { Knex } from 'knex';
import type { Engine } from '../core';
import {
  KnexTransaction,
  type KnexTransactionOptions,
  type KnexTransactionEvents,
} from './knex-transaction';

export class KnexEngine
  implements
    Engine<KnexTransaction, KnexTransactionOptions, KnexTransactionEvents>
{
  public constructor(private readonly knex: Knex) {}

  public async createTransaction(
    options: KnexTransactionOptions,
  ): Promise<KnexTransaction> {
    return await KnexTransaction.create(this.knex, options);
  }
}
