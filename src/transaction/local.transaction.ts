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

export class LocalTransaction extends Transaction {
  protected constructor(
    public readonly knex: Knex,
    public readonly isolationLevel: IsolationLevel,
  ) {
    super();
  }

  async flush(): Promise<void> {
    const trx = await this.knex.transaction(null, {
      isolationLevel: this.isolationLevel,
    });

    try {
      await this.emit('flush', {
        knex: trx,
      });

      await trx.commit();
    } catch (e) {
      await trx.rollback();
      this.emit('rollback', undefined).catch(console.error);

      throw e;
    }

    this.emit('commit', undefined).catch(console.error);
  }

  static async run<R>({
    knex,
    isolationLevel,
    unit,
    retries,
  }: Options<R>): Promise<R> {
    const transaction = new this(knex, isolationLevel || 'read committed');

    const maxAttempts = retries || 3;

    const run = async (attempt: number): Promise<R> => {
      try {
        const context = new Context(transaction);
        const result = await unit(context);
        await transaction.flush();

        return result;
      } catch (e) {
        if (e instanceof PersistenceError && attempt < maxAttempts) {
          return await run(attempt + 1);
        }

        throw e;
      }
    };

    return run(1);
  }
}
