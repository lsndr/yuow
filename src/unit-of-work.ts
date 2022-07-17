import { Knex } from 'knex';
import { Context } from './context';
import { LocalTransaction } from './transaction/local.transaction';
import { GlobalTransaction } from './transaction/global.transaction';
import { IsolationLevel } from './transaction/transaction.interface';

export type UowOptions<S = any> = {
  isolationLevel: IsolationLevel;
  maxAttempts: number;
  globalTransaction: boolean;
  initialState?: S;
  onFlush?: (payload: { knex: Knex }) => void;
  onCommit?: (payload: { state: S }) => void;
  onRollback?: () => void;
};

export type Uow<S = unknown> = <R>(
  unit: (uow: Context) => R | Promise<R>,
  options?: Partial<UowOptions<S>>,
) => Promise<R>;

export function uowFactory<S>(knex: Knex): Uow<S> {
  return async (unit, partialOptions) => {
    const options: UowOptions<S> = {
      isolationLevel: 'read committed',
      globalTransaction: false,
      maxAttempts: 3,
      ...partialOptions,
    };

    if (!options.globalTransaction) {
      return LocalTransaction.run({
        unit,
        knex,
        initialState: options.initialState,
        isolationLevel: options.isolationLevel,
        maxAttempts: options.maxAttempts,
        onCommit: options.onCommit,
        onFlush: options.onFlush,
        onRollback: options.onRollback,
      });
    } else {
      return GlobalTransaction.run({
        unit,
        knex,
        initialState: options.initialState,
        isolationLevel: options.isolationLevel,
        maxAttempts: options.maxAttempts,
        onCommit: options.onCommit,
        onFlush: options.onFlush,
        onRollback: options.onRollback,
      });
    }
  };
}
