import {
  AsyncEventEmitter,
  type AsyncEventEmitterHandler,
  type AsyncEventEmitterEvents,
} from './async-event-emitter';

export abstract class Broadcaster<E extends AsyncEventEmitterEvents> {
  private readonly eventEmitter = new AsyncEventEmitter<E>();

  public on<K extends keyof E>(
    event: K,
    handler: AsyncEventEmitterHandler<E[K]>,
  ): void {
    this.eventEmitter.on(event, handler);
  }

  public off<K extends keyof E>(
    event: K,
    handler: AsyncEventEmitterHandler<E[K]>,
  ): boolean {
    return this.eventEmitter.off(event, handler);
  }

  protected async emit<K extends keyof E>(
    event: K,
    ...args: E[K]
  ): Promise<void> {
    await this.eventEmitter.emit(event, args);
  }
}
