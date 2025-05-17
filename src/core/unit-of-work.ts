import { Context } from './context';
import { RunError } from './run-error';
import type { Transaction, TransactionEvents } from './transaction/transaction';
import {
  AsyncEventEmitter,
  type AsyncEventEmitterHandler,
} from './async-event-emitter/async-event-emitter';
import type { Engine } from './transaction/engine';
import { PersistenceError } from './persistence.error';
import type {
  InferEngineTransaction,
  InferTransactionEvents,
  InferTransactionOptions,
} from './transaction/utilts';

interface RunConfig<O> {
  readonly attempts: number;
  readonly transaction?: O;
}

export type RunOptions<O> = Partial<RunConfig<O>>;

export type Unit<
  R,
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> = (uow: Context<T, TE>) => R | Promise<R>;

export interface UowEvents<
  T extends Transaction<TE>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> {
  beforeRun: { attempt: number; context: Context<T, TE> };
  afterRun: { attempt: number; context: Context<T, TE>; error?: unknown };
}

export class Uow<
  E extends Engine<T, TO, TE>,
  T extends Transaction<TE> = InferEngineTransaction<E>,
  TO = InferTransactionOptions<E>,
  TE extends TransactionEvents = InferTransactionEvents<T>,
> {
  private readonly eventEmitter = new AsyncEventEmitter<UowEvents<T, TE>>();

  public constructor(public readonly engine: E) {}

  public on<E extends keyof UowEvents<T, TE>>(
    event: E,
    listener: AsyncEventEmitterHandler<UowEvents<T, TE>[E]>,
  ): void {
    this.eventEmitter.on(event, listener);
  }

  public off<E extends keyof UowEvents<T, TE>>(
    event: E,
    listener: AsyncEventEmitterHandler<UowEvents<T, TE>[E]>,
  ): boolean {
    return this.eventEmitter.off(event, listener);
  }

  public async run<R>(
    unit: Unit<R, T, TE>,
    options?: RunOptions<TO>,
  ): Promise<R> {
    const config: RunConfig<TO> = {
      attempts: 3,
      ...options,
    };

    let attempt = 0;
    const errors: any[] = [];

    const transaction = await this.engine.createTransaction(config.transaction);

    const run = async (): Promise<R> => {
      attempt += 1;

      const context = new Context<T, TE>(transaction);

      await this.eventEmitter.emit('beforeRun', { attempt, context });

      try {
        const result = await unit(context);

        await transaction.flush();
        await transaction.commit();

        await this.eventEmitter.emit('afterRun', { attempt, context });

        return result;
      } catch (error) {
        await transaction.rollback();

        await this.eventEmitter.emit('afterRun', { attempt, context, error });

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
