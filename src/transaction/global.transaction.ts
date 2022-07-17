import { Knex } from 'knex';
import { Context } from './../context';
import { OptimisticError } from './optimistic.error';
import { IsolationLevel, Transaction } from './transaction.interface';

type Unit<R> = (uow: Context) => R | Promise<R>;

export type Options<R, S = any> = {
  unit: Unit<R>;
  knex: Knex;
  maxAttempts: number;
  isolationLevel: IsolationLevel;
  initialState?: S;
  onFlush?: (payload: { knex: Knex }) => void;
  onCommit?: (payload: { state: S }) => void;
  onRollback?: () => void;
};

export class GlobalTransaction extends Transaction {
  protected constructor(
    public readonly transaction: Knex.Transaction,
    state: any,
  ) {
    super(state);
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
    this.emit('commit', {
      state: this.state,
    }).catch(console.error);
  }

  async rollback() {
    await this.transaction.rollback();
    this.emit('rollback', undefined).catch(console.error);
  }

  static async run<R>({
    knex,
    isolationLevel,
    unit,
    onCommit,
    maxAttempts,
    initialState,
    onFlush,
    onRollback,
  }: Options<R>): Promise<R> {
    const run = async (attempt: number): Promise<R> => {
      const trx = await knex.transaction(null, {
        isolationLevel: isolationLevel,
      });

      const transaction = new this(trx, initialState);

      if (onCommit) {
        transaction.on('commit', onCommit);
      }

      if (onFlush) {
        transaction.on('flush', onFlush);
      }

      if (onRollback) {
        transaction.on('rollback', onRollback);
      }

      try {
        const context = new Context(transaction);
        const result = await unit(context);
        await transaction.flush();
        await transaction.commit();

        return result;
      } catch (e) {
        await transaction.rollback();

        if (e instanceof OptimisticError && attempt < maxAttempts) {
          return await run(attempt + 1);
        }

        throw e;
      }
    };

    return run(1);
  }
}
