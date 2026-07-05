import { Transaction } from '../core';

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const ROLLBACK_SENTINEL: unique symbol = Symbol('prisma-rollback');

export interface PrismaClientLike {
  $transaction<R>(
    fn: (tx: any) => Promise<R>,
    options?: {
      isolationLevel?: unknown;
      timeout?: number;
      maxWait?: number;
    },
  ): Promise<R>;
}

export interface PrismaTransactionOptions<I> {
  /** If true, the transaction is started immediately in createTransaction(). */
  readonly global?: boolean;
  /** Prisma transaction isolation level (e.g. Prisma.TransactionIsolationLevel.Serializable). */
  readonly isolationLevel?: I;
  /**
   * Maximum number of milliseconds Prisma waits to acquire a transaction from the pool.
   */
  readonly maxWait?: number;
  /**
   * Maximum duration of the interactive transaction in milliseconds.
   */
  readonly timeout?: number;
}

export class PrismaTransaction<
  TClient extends PrismaClientLike,
  TIsolationLevel,
> extends Transaction {
  private readonly _client: TClient;
  private _tx?: TClient;
  private _settle?: Deferred<void>;
  private _completion?: Promise<void>;

  public constructor(
    client: TClient,
    public readonly options?: PrismaTransactionOptions<TIsolationLevel>,
  ) {
    super();
    this._client = client;
  }

  public get prisma(): TClient {
    return this._tx ?? this._client;
  }

  protected async doBegin(): Promise<void> {
    if (this._tx) {
      throw new Error('Transaction already intialized');
    }

    const ready = createDeferred<void>();
    const settle = createDeferred<void>();

    this._settle = settle;

    this._completion = this._client.$transaction(
      async (tx) => {
        this._tx = tx as TClient;
        ready.resolve();
        await settle.promise;
      },
      {
        isolationLevel: this.options?.isolationLevel,
        timeout: this.options?.timeout,
        maxWait: this.options?.maxWait,
      },
    );

    await ready.promise;
  }

  protected async doCommit(): Promise<void> {
    if (!this._settle) {
      throw new Error('Transaction not initialized');
    }

    this._settle.resolve();
    await this._completion;
  }

  protected async doRollback(): Promise<void> {
    if (!this._settle) {
      throw new Error('Transaction not initialized');
    }

    this._settle.reject(ROLLBACK_SENTINEL);

    try {
      await this._completion;
    } catch (error) {
      // Swallow the sentinel; re-throw anything unexpected.
      if (error !== ROLLBACK_SENTINEL) {
        throw error;
      }
    }
  }
}
