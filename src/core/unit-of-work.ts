import { Context } from './context';
import { RunError } from './run-error';
import type { Transaction, TransactionEvents } from './transaction/transaction';
import type { Engine } from './transaction/engine';
import { PersistenceError } from './persistence.error';
import type {
  InferEngineTransaction,
  InferTransactionEvents,
  InferTransactionOptions,
} from './transaction/utilts';

interface RunConfig<O> {
  retries: number;
  transaction?: O;
}

export type RunOptions<O> = Partial<RunConfig<O>>;

export type Unit<
  R,
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> = (uow: Context<T, TE>) => R | Promise<R>;

export class Uow<
  E extends Engine<T, TO, TE>,
  T extends Transaction<TE> = InferEngineTransaction<E>,
  TO = InferTransactionOptions<E>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> {
  public constructor(public readonly engine: E) {}

  public async run<R>(
    unit: Unit<R, T, TE>,
    options?: RunOptions<TO>,
  ): Promise<R> {
    const config: RunConfig<TO> = {
      retries: 3,
      ...options,
    };

    let attempt = 0;
    const errors: any[] = [];

    const transaction = await this.engine.createTransaction(config.transaction);

    const run = async (): Promise<R> => {
      attempt += 1;

      const context = new Context<T, TE>(transaction);

      try {
        const result = await unit(context);

        await transaction.flush();
        await transaction.commit();

        return result;
      } catch (error) {
        await transaction.rollback();

        if (!(error instanceof PersistenceError)) {
          throw error;
        }

        errors.push(error);

        if (attempt >= config.retries) {
          throw new RunError(errors);
        }

        return run();
      }
    };

    return run();
  }
}
