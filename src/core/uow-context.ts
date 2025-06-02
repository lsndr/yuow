import type { Engine } from './transaction/engine';
import type { Transaction, TransactionEvents } from './transaction/transaction';
import type {
  InferEngineTransaction,
  InferTransactionEvents,
  InferTransactionOptions,
} from './transaction/utils';
import type { Uow } from './uow';
import { AsyncLocalStorage } from 'async_hooks';

type InferEngine<U> = U extends Uow<infer E, any, any, any> ? E : never;

export class UowContext {
  private static asyncLocalStorage = new AsyncLocalStorage();

  public static uow<
    U extends Uow<E, T, TO, TE> = Uow<any, any, any, any>,
    E extends Engine<T, TO, TE> = InferEngine<U>,
    T extends Transaction<TE> = InferEngineTransaction<E>,
    TO = InferTransactionOptions<E>,
    TE extends TransactionEvents = InferTransactionEvents<T>,
  >(): U {
    const uow = this.asyncLocalStorage.getStore();

    if (!uow) {
      throw new Error('UowContext is not detected');
    }

    return uow as U;
  }

  public static async create<R>(
    uow: Uow<any, any, any, any>,
    act: () => R,
  ): Promise<Awaited<R>> {
    return await this.asyncLocalStorage.run(uow, act);
  }
}
