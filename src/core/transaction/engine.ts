import type { Transaction, TransactionEvents } from './transaction';

export interface Engine<
  T extends Transaction<TE>,
  TO,
  TE extends TransactionEvents = T extends Transaction<infer TE> ? TE : never,
> {
  createTransaction(options?: TO): Promise<T>;
}
