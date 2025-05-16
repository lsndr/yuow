import * as EventEmitter from 'emittery';

export interface TransactionEvents {
  beforeFlush: undefined;
  flush: undefined;
  afterFlush: undefined;

  beforeCommit: undefined;
  commit: undefined;
  afterCommit: undefined;

  beforeRollback: undefined;
  rollback: undefined;
  afterRollback: undefined;
}

export type TranscationEventListener<E extends keyof TransactionEvents> = (
  payload: TransactionEvents[E],
) => void | Promise<void>;

export abstract class Transaction<
  T extends TransactionEvents = TransactionEvents,
> {
  private readonly eventEmitter = new EventEmitter<T>();

  public async commit(): Promise<void> {
    await this.eventEmitter.emit('beforeCommit', undefined);
    await this.eventEmitter.emit('commit', undefined);
    await this.eventEmitter.emit('afterCommit', undefined);
  }

  public async rollback(): Promise<void> {
    await this.eventEmitter.emit('beforeRollback', undefined);
    await this.eventEmitter.emit('rollback', undefined);
    await this.eventEmitter.emit('afterRollback', undefined);
  }

  public async flush(): Promise<void> {
    await this.eventEmitter.emit('beforeFlush', undefined);
    await this.eventEmitter.emit('flush', undefined);
    await this.eventEmitter.emit('afterFlush', undefined);
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

  protected emit<E extends keyof Omit<T, keyof TransactionEvents>>(
    event: E,
    payload: T[E],
  ): Promise<void> {
    return this.eventEmitter.emit(event, payload);
  }
}
