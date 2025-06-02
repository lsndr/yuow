import { type AsyncEventEmitterEvents } from './async-event-emitter';
import { Broadcaster } from './broadcaster';
import { Context } from './context';
import { ContextProvider } from './context-provider';
import { PersistenceError } from './persistence.error';
import { RunError } from './run-error';
import {
  TransactionState,
  type Transaction,
  type TransactionEvents,
  type Engine,
  type InferEngineTransaction,
  type InferTransactionEvents,
  type InferTransactionOptions,
} from './transaction';

interface RunConfig<O> {
  readonly attempts: number;
  readonly transaction?: O;
}

export type RunOptions<O> = Partial<RunConfig<O>>;

export type Unit<
  R,
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> = (context: Context<T, TE>) => R | Promise<R>;

export interface UowEvents<
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> extends AsyncEventEmitterEvents {
  beforeRun: [Context<T, TE>, { attempt: number }];
  afterRun: [Context<T, TE>, { attempt: number; error?: unknown }];
}

export class Uow<
  E extends Engine<T, TO, TE>,
  T extends Transaction<TE> = InferEngineTransaction<E>,
  TO = InferTransactionOptions<E>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> extends Broadcaster<UowEvents<T, TE>> {
  public constructor(public readonly engine: E) {
    super();
  }

  public async run<R>(
    unit: Unit<R, T, TE>,
    options?: RunOptions<TO>,
  ): Promise<R> {
    const config: RunConfig<TO> = {
      attempts: options?.attempts ?? 3,
      transaction: options?.transaction,
    };

    let attempt = 0;
    const errors: any[] = [];

    const run = async (): Promise<R> => {
      attempt += 1;

      const transaction = await this.engine.createTransaction(
        config.transaction,
      );
      const context = new Context<T, TE>(transaction);
      await this.emit('beforeRun', context, { attempt });

      try {
        const result = await ContextProvider.create(context, async () =>
          unit(context),
        );

        await context.flush();

        if (transaction.state === TransactionState.BEGUN) {
          await transaction.commit();
        }

        await this.emit('afterRun', context, { attempt });

        return result;
      } catch (error) {
        if (transaction.state === TransactionState.BEGUN) {
          await transaction.rollback();
        }

        await this.emit('afterRun', context, { attempt, error });

        if (!(error instanceof PersistenceError)) {
          throw error;
        }

        errors.push(error);

        if (attempt >= config.attempts) {
          throw new RunError(errors);
        }

        return run();
      }
    };

    return run();
  }
}
