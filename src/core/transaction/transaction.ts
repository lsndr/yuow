import * as EventEmitter from 'emittery';

export interface TransactionEvents {
  flush: unknown;
}

export type TranscationEventListener<E extends keyof TransactionEvents> = (
  payload: TransactionEvents[E],
) => void | Promise<void>;

export abstract class Transaction<
  O = undefined,
  T extends TransactionEvents = TransactionEvents,
> {
  protected readonly eventEmitter: EventEmitter<T>;
  protected readonly options: O;

  abstract commit(): Promise<void>;

  abstract rollback(): Promise<void>;

  protected constructor(options: O) {
    this.eventEmitter = new EventEmitter();
    this.options = options;
  }

  public async flush(): Promise<void> {
    await this.eventEmitter.emit('flush', undefined);
  }

  public on<E extends keyof T>(
    event: E,
    listener: (payload: T[E]) => void | Promise<void>,
  ) {
    this.eventEmitter.on(event, listener);
  }

  public off<E extends keyof T>(
    event: E,
    listener: (payload: T[E]) => void | Promise<void>,
  ) {
    this.eventEmitter.off(event, listener);
  }
}
