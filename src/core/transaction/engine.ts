import type { Transaction, TransactionEvents } from './transaction';

export interface Engine<
  T extends Transaction<E>,
  O,
  E extends TransactionEvents,
> {
  createTransaction(options?: O): Promise<T>;
}
