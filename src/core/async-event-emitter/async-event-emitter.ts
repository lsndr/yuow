import {
  ListenersStore,
  type EventHandler,
  type Events,
} from './listeners-store';

export type AsyncEventEmitterHandler<P> = EventHandler<P>;

export type AsyncEventEmitterEvents = Events;

export class AsyncEventEmitter<E extends AsyncEventEmitterEvents> {
  private listenersStore = new ListenersStore<E>();

  public async emit<K extends keyof E>(event: K, payload: E[K]): Promise<void> {
    const handlers = this.listenersStore.get(event);

    for (const handler of handlers) {
      await handler(payload);
    }
  }

  public on<K extends keyof E>(
    event: K,
    handler: AsyncEventEmitterHandler<E[K]>,
  ): void {
    this.listenersStore.get(event).add(handler);

    return;
  }

  public off<K extends keyof E>(
    event: K,
    handler: AsyncEventEmitterHandler<E[K]>,
  ): boolean {
    return this.listenersStore.get(event).delete(handler);
  }
}
