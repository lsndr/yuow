import type { Engine } from '../core';
import {
  KnexTransaction,
  type KnexTransactionOptions,
} from './knex-transaction';
import type { Knex } from 'knex';

export class KnexEngine
  implements Engine<KnexTransaction, KnexTransactionOptions>
{
  public constructor(private readonly knex: Knex) {}

  public async createTransaction(
    options?: KnexTransactionOptions,
  ): Promise<KnexTransaction> {
    const knex = new KnexTransaction(this.knex, options);
    if (options?.global) {
      await knex.begin();
    }

    return knex;
  }
}
