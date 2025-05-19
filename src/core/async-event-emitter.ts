export type AsyncEventEmitterHandler<P> = (payload: P) => Promise<void> | void;

export type AsyncEventEmitterEvents = Record<string, any>;

export class AsyncEventEmitter<E extends AsyncEventEmitterEvents> {
  private listeners = new Map<keyof E, Set<AsyncEventEmitterHandler<any>>>();

  public async emit<K extends keyof E>(event: K, payload: E[K]): Promise<void> {
    const handlers = this.listeners.get(event) ?? new Set();

    for (const handler of handlers) {
      await handler(payload);
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
