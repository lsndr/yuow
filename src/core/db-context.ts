import { Transaction, TransactionEvents } from './transaction/transaction';

export class DBContext<
  T extends Transaction<O, E>,
  O = undefined,
  E extends TransactionEvents = TransactionEvents,
> {
  constructor(public readonly transaction: T) {}
}
