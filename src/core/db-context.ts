import { Transaction, TransactionEvents } from './transaction/transaction';

export class DBContext<
  T extends Transaction<E>,
  E extends TransactionEvents = TransactionEvents,
> {
  constructor(public readonly transaction: T) {}
}
