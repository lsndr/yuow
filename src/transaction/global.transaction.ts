import { Knex } from 'knex';
import { Context } from './../context';
import { PersistenceError } from './persistence.error';
import { IsolationLevel, Transaction } from './transaction.interface';

type Unit<R> = (uow: Context) => R | Promise<R>;

export type Options<R> = {
  unit: Unit<R>;
  knex: Knex;
  retries?: number;
  isolationLevel?: IsolationLevel;
};

export class GlobalTransaction extends Transaction {
  protected constructor(public readonly transaction: Knex.Transaction) {
    super();
  }

  get knex() {
    return this.transaction;
  }

  async flush(): Promise<void> {
    await this.emit('flush', {
      knex: this.transaction,
    });
  }

  async commit() {
    await this.transaction.commit();
    this.emit('commit', undefined).catch(console.error);
  }

  async rollback() {
    await this.transaction.rollback();
    this.emit('rollback', undefined).catch(console.error);
  }

  static async run<R>({
    unit,
    knex,
    isolationLevel,
    retries,
  }: Options<R>): Promise<R> {
    const maxAttempts = retries || 0;

    const run = async (attempt: number): Promise<R> => {
      const trx = await knex.transaction(null, {
        isolationLevel: isolationLevel || 'read committed',
      });

      const transaction = new this(trx);

      try {
        const context = new Context(transaction);
        const result = await unit(context);
        await transaction.flush();
        await transaction.commit();

        return result;
      } catch (e) {
        await transaction.rollback();

        if (e instanceof PersistenceError && attempt < maxAttempts) {
          return await run(attempt + 1);
        }

        throw e;
      }
    };

    return run(1);
  }
}
