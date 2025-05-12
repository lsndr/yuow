import { Engine } from '../../src';
import { Knex } from 'knex';
import { KnexTransaction, KnexTransactionOptions } from './knex.transaction';

export class KnexEngine
  implements Engine<KnexTransaction, KnexTransactionOptions>
{
  constructor(private readonly knex: Knex) {}

  async createTransaction(options: KnexTransactionOptions) {
    const trx = await this.knex.transaction();

    return new KnexTransaction(trx, options);
  }
}
