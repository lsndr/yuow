import { Broadcaster } from '../broadcaster';

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
  ROLLED_BACK = 'ROLLED_DBACK',
}

export abstract class Transaction<
  TE extends TransactionEvents = TransactionEvents,
> extends Broadcaster<TE> {
  private _state: TransactionState = TransactionState.INITIALIZED;

  protected abstract doBegin(): Promise<void>;
  protected abstract doCommit(): Promise<void>;
  protected abstract doRollback(): Promise<void>;

  public get state(): TransactionState {
    return this._state;
  }

  public async begin(): Promise<void> {
    this.assertState(TransactionState.INITIALIZED);

    await super.emit('beforeBegin', undefined);

    await this.doBegin();
    this._state = TransactionState.BEGUN;

    await super.emit('afterBegin', undefined);
  }

  public async commit(): Promise<void> {
    this.assertState(TransactionState.BEGUN);

    await super.emit('beforeCommit', undefined);

    await this.doCommit();
    this._state = TransactionState.COMMITTED;

    await super.emit('afterCommit', undefined);
  }

  public async rollback(): Promise<void> {
    this.assertState(TransactionState.BEGUN);

    await super.emit('beforeRollback', undefined);

    await this.doRollback();
    this._state = TransactionState.ROLLED_BACK;

    await super.emit('afterRollback', undefined);
  }

  protected override emit<
    E extends keyof (TE & Record<keyof TransactionEvents, never>),
  >(event: keyof TE, payload: TE[E]): Promise<void> {
    return super.emit(event, payload);
  }

  private assertState(state: TransactionState) {
    if (this._state !== state) {
      throw new Error(
        `Transaction is expected to be in ${state} but it is in ${this._state}`,
      );
    }
  }
}
