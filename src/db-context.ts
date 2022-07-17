import {
  Transaction,
  EventListener,
  Events,
} from './transaction/transaction.interface';

export class DBContext<S = unknown> {
  public get knex() {
    return this.transaction.knex;
  }

  public get state() {
    return this.transaction.state;
  }

  constructor(private readonly transaction: Transaction<S>) {}

  public on<E extends keyof Events<S>>(
    event: E,
    listener: EventListener<E, S>,
  ) {
    this.transaction.on(event, listener);
  }
}
