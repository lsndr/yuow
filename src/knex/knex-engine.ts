import { Engine } from '../core';
import { Knex } from 'knex';
import { KnexTransaction, KnexTransactionOptions } from './knex-transaction';

export class KnexEngine
  implements Engine<KnexTransaction, KnexTransactionOptions>
{
  constructor(private readonly knex: Knex) {}

  async createTransaction(options: KnexTransactionOptions) {
    return await KnexTransaction.create(this.knex, options);
  }
}
