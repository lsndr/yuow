import { Knex } from 'knex';
import { Context } from './context';
import { LocalTransaction } from './transaction/local.transaction';
import { GlobalTransaction } from './transaction/global.transaction';
import { IsolationLevel } from './transaction/transaction.interface';

export type UowConfig = {
  isolationLevel: IsolationLevel;
  maxAttempts: number;
  globalTransaction: boolean;
  onFlush?: (payload: { knex: Knex }) => void;
  onCommit?: () => void;
  onRollback?: () => void;
};

export type UowOptions = Partial<UowConfig>;

export type Unit<R> = (uow: Context) => R | Promise<R>;

export type Uow = <R>(unit: Unit<R>, options?: UowOptions) => R | Promise<R>;

export const uowFactory = (knex: Knex): Uow => {
  return <R>(unit: Unit<R>, options?: UowOptions) => {
    const config: UowConfig = {
      isolationLevel: 'read committed',
      globalTransaction: false,
      maxAttempts: 3,
      ...options,
    };

    if (!config.globalTransaction) {
      return LocalTransaction.run({
        unit,
        knex,
        isolationLevel: config.isolationLevel,
        maxAttempts: config.maxAttempts,
        onCommit: config.onCommit,
        onFlush: config.onFlush,
        onRollback: config.onRollback,
      });
    } else {
      return GlobalTransaction.run({
        unit,
        knex,
        isolationLevel: config.isolationLevel,
        maxAttempts: config.maxAttempts,
        onCommit: config.onCommit,
        onFlush: config.onFlush,
        onRollback: config.onRollback,
      });
    }
  };
};
