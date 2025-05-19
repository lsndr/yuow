import {
  AsyncEventEmitter,
  type AsyncEventEmitterHandler,
} from '../async-event-emitter';

export interface TransactionEvents {
  beforeBegin: undefined;
  afterBegin: undefined;

  beforeCommit: undefined;
  afterCommit: undefined;

  beforeRollback: undefined;
  afterRollback: undefined;
}

export type TransactionEventListener<E extends keyof TransactionEvents> = (
  payload: TransactionEvents[E],
) => void | Promise<void>;

export enum TransactionState {
  INITIALIZED = 'INITIALIZED',
  BEGUN = 'BEGUN',
  COMMITTED = 'COMMITTED',
  ROLLED_BACK = 'ROLLE_DBACK',
}

export abstract class Transaction<
  T extends TransactionEvents = TransactionEvents,
> {
  private _state: TransactionState = TransactionState.INITIALIZED;
  private readonly eventEmitter = new AsyncEventEmitter<T>();

  protected abstract doBegin(): Promise<void>;
  protected abstract doCommit(): Promise<void>;
  protected abstract doRollback(): Promise<void>;

  public get state(): TransactionState {
    return this._state;
  }

  public async begin(): Promise<void> {
    this.assertState(TransactionState.INITIALIZED);

    await this.eventEmitter.emit('beforeBegin', undefined);

    await this.doBegin();
    this._state = TransactionState.BEGUN;

    await this.eventEmitter.emit('afterBegin', undefined);
  }

  public async commit(): Promise<void> {
    this.assertState(TransactionState.BEGUN);

    await this.eventEmitter.emit('beforeCommit', undefined);

    await this.doCommit();
    this._state = TransactionState.COMMITTED;

    await this.eventEmitter.emit('afterCommit', undefined);
  }

  public async rollback(): Promise<void> {
    this.assertState(TransactionState.BEGUN);

    await this.eventEmitter.emit('beforeRollback', undefined);

    await this.doRollback();
    this._state = TransactionState.ROLLED_BACK;

    await this.eventEmitter.emit('afterRollback', undefined);
  }

  public on<E extends keyof T>(
    event: E,
    listener: AsyncEventEmitterHandler<T[E]>,
  ): void {
    this.eventEmitter.on(event, listener);
  }

  public off<E extends keyof T>(
    event: E,
    listener: AsyncEventEmitterHandler<T[E]>,
  ): void {
    this.eventEmitter.off(event, listener);
  }

  protected emit<E extends keyof Omit<T, keyof TransactionEvents>>(
    event: E,
    payload: T[E],
  ): Promise<void> {
    return this.eventEmitter.emit(event, payload);
  }

  private assertState(state: TransactionState) {
    if (this._state !== state) {
      throw new Error(
        `Transaction is expected to be in ${state} but it is in ${this._state}`,
      );
    }
  }
}
