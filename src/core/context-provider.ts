import { AsyncLocalStorage } from 'async_hooks';

/**
 * @internal
 */
export class ContextProvider {
  private static asyncLocalStorage = new AsyncLocalStorage<any>();

  public static create<R, C = any>(context: C, act: () => R): R {
    return this.asyncLocalStorage.run(context, act);
  }

  public static get<T>(): T {
    const ctx = this.asyncLocalStorage.getStore();

    if (!ctx) {
      throw new Error('Context is not detected');
    }

    return ctx;
  }
}
