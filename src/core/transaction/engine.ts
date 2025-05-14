import type { Transaction, TransactionEvents } from './transaction';

export interface Engine<
  T extends Transaction<E>,
  O = undefined,
  E extends TransactionEvents = TransactionEvents,
> {
  createTransaction(options?: O): Promise<T>;
}
