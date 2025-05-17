export type EventHandler<P> = (payload: P) => Promise<void> | void;

export type Events = Record<string, any>;

export class ListenersStore<E extends Events> {
  private eventListeners = new Map<keyof E, Set<EventHandler<E[keyof E]>>>();

  public get<K extends keyof E>(event: K): Set<EventHandler<E[K]>> {
    let listener = this.eventListeners.get(event);

    if (!listener) {
      listener = new Set<EventHandler<E[keyof E]>>();
      this.eventListeners.set(event, listener);
    }

    return listener;
  }
}
