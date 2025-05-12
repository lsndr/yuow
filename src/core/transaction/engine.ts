import { Transaction, TransactionEvents } from './transaction';

export interface Engine<
  T extends Transaction<O, E>,
  O = undefined,
  E extends TransactionEvents = TransactionEvents,
> {
  createTransaction(options?: O): Promise<T>;
}
