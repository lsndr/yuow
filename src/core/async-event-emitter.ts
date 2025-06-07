export type AsyncEventEmitterHandler<P extends unknown[]> = (
  ...args: P
) => Promise<void> | void;

/**
 * @internal
 */
export type AsyncEventEmitterEvents = Record<any, unknown[]>;

/**
 * @internal
 */
export class AsyncEventEmitter<E extends AsyncEventEmitterEvents> {
  private listeners = new Map<keyof E, Set<AsyncEventEmitterHandler<any>>>();

  public async emit<K extends keyof E>(
    event: K,
    ...payload: E[K]
  ): Promise<void> {
    const handlers = this.listeners.get(event) ?? new Set();

    for (const handler of handlers) {
      await handler(...payload);
    }
  }

  public on<K extends keyof E>(
    event: K,
    handler: AsyncEventEmitterHandler<E[K]>,
  ): void {
    let handlers = this.listeners.get(event);

    if (!handlers) {
      handlers = new Set();
      this.listeners.set(event, handlers);
    }

    handlers.add(handler);
  }

  public off<K extends keyof E>(
    event: K,
    handler: AsyncEventEmitterHandler<E[K]>,
  ): boolean {
    return !!this.listeners.get(event)?.delete(handler);
  }
}
