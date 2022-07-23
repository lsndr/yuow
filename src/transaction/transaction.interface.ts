import { Knex } from 'knex';
import * as EventEmitter from 'emittery';

export type IsolationLevel =
  | 'read uncommitted'
  | 'read committed'
  | 'snapshot'
  | 'repeatable read'
  | 'serializable';

export type Events = {
  flush: {
    knex: Knex;
  };
  commit: undefined;
  rollback: undefined;
};

export type EventListener<E extends keyof Events> = (
  payload: Events[E],
) => void | Promise<void>;
export abstract class Transaction {
  private readonly eventEmitter: EventEmitter<Events>;
  abstract knex: Knex;

  abstract flush(): Promise<void>;

  protected constructor() {
    this.eventEmitter = new EventEmitter();
  }

  protected async emit<E extends keyof Events>(
    event: E,
    payload: Events[E],
  ): Promise<void> {
    await this.eventEmitter.emit(event, payload);
  }

  public on<E extends keyof Events>(
    event: E,
    listener: (payload: Events[E]) => void | Promise<void>,
  ) {
    this.eventEmitter.on(event, listener);
  }

  public off<E extends keyof Events>(
    event: E,
    listener: (payload: Events[E]) => void | Promise<void>,
  ) {
    this.eventEmitter.off(event, listener);
  }
}
