import {
  Transaction,
  EventListener,
  Events,
} from './transaction/transaction.interface';

export class DBContext {
  public get knex() {
    return this.transaction.knex;
  }

  constructor(private readonly transaction: Transaction) {}

  public on<E extends keyof Events>(event: E, listener: EventListener<E>) {
    this.transaction.on(event, listener);
  }
}
