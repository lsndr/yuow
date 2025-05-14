import * as EventEmitter from 'emittery';

export interface TransactionEvents {
  flush: unknown;
}

export type TranscationEventListener<E extends keyof TransactionEvents> = (
  payload: TransactionEvents[E],
) => void | Promise<void>;

export abstract class Transaction<
  T extends TransactionEvents = TransactionEvents,
> {
  protected readonly eventEmitter: EventEmitter<T>;

  protected constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public abstract commit(): Promise<void>;

  public abstract rollback(): Promise<void>;

  public async flush(): Promise<void> {
    await this.eventEmitter.emit('flush', undefined);
  }

  public on<E extends keyof T>(
    event: E,
    listener: (payload: T[E]) => void | Promise<void>,
  ): void {
    this.eventEmitter.on(event, listener);
  }

  public off<E extends keyof T>(
    event: E,
    listener: (payload: T[E]) => void | Promise<void>,
  ): void {
    this.eventEmitter.off(event, listener);
  }
}
