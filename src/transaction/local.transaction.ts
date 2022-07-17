import { Knex } from 'knex';
import { Context } from './../context';
import { OptimisticError } from './optimistic.error';
import { IsolationLevel, Transaction } from './transaction.interface';

type Unit<R> = (uow: Context) => R | Promise<R>;

export type Options<R, S = any> = {
  unit: Unit<R>;
  knex: Knex;
  isolationLevel: IsolationLevel;
  maxAttempts: number;
  initialState?: S;
  onFlush?: (payload: { knex: Knex }) => void;
  onCommit?: (payload: { state: S }) => void;
  onRollback?: () => void;
};

export class LocalTransaction extends Transaction {
  protected constructor(
    public readonly knex: Knex,
    public readonly isolationLevel: IsolationLevel,
    state: any,
  ) {
    super(state);
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

    this.emit('commit', {
      state: this.state,
    }).catch(console.error);
  }

  static async run<R>({
    knex,
    isolationLevel,
    unit,
    maxAttempts,
    onCommit,
    initialState,
    onFlush,
    onRollback,
  }: Options<R>): Promise<R> {
    const transaction = new this(knex, isolationLevel, initialState);

    if (onCommit) {
      transaction.on('commit', onCommit);
    }

    if (onFlush) {
      transaction.on('flush', onFlush);
    }

    if (onRollback) {
      transaction.on('rollback', onRollback);
    }

    const run = async (attempt: number): Promise<R> => {
      try {
        const context = new Context(transaction);
        const result = await unit(context);
        await transaction.flush();

        return result;
      } catch (e) {
        if (e instanceof OptimisticError && attempt < maxAttempts) {
          return await run(attempt + 1);
        }

        throw e;
      }
    };

    return run(1);
  }
}
