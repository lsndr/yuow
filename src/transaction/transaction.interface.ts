import { Knex } from 'knex';
import * as EventEmitter from 'emittery';

export type IsolationLevel =
  | 'read uncommitted'
  | 'read committed'
  | 'snapshot'
  | 'repeatable read'
  | 'serializable';

export type Events<S> = {
  flush: {
    knex: Knex;
  };
  commit: {
    state: S;
  };
  rollback: undefined;
};

export type EventListener<E extends keyof Events<S>, S> = (
  payload: Events<S>[E],
) => void | Promise<void>;
export abstract class Transaction<S = any> {
  public readonly state: S;
  private readonly eventEmitter: EventEmitter<Events<S>>;
  abstract knex: Knex;

  abstract flush(): Promise<void>;

  protected constructor(state: S) {
    this.eventEmitter = new EventEmitter();
    this.state = state;
  }

  protected async emit<E extends keyof Events<S>>(
    event: E,
    payload: Events<S>[E],
  ): Promise<void> {
    await this.eventEmitter.emit(event, payload);
  }

  public on<E extends keyof Events<S>>(
    event: E,
    listener: (payload: Events<S>[E]) => void | Promise<void>,
  ) {
    this.eventEmitter.on(event, listener);
  }

  public off<E extends keyof Events<S>>(
    event: E,
    listener: (payload: Events<S>[E]) => void | Promise<void>,
  ) {
    this.eventEmitter.off(event, listener);
  }
}
