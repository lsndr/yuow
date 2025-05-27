import type { AsyncEventEmitterEvents } from './async-event-emitter';
import { Broadcaster } from './broadcaster';

interface TestBroadcasterEvents extends AsyncEventEmitterEvents {
  event1: [unknown];
  event2: [unknown];
}

class TestBroadcaster extends Broadcaster<TestBroadcasterEvents> {
  public override async emit<K extends keyof TestBroadcasterEvents>(
    event: K,
    ...args: TestBroadcasterEvents[K]
  ): Promise<void> {
    await super.emit(event, ...args);
  }
}

describe(Broadcaster, () => {
  let broadcaster: TestBroadcaster;

  beforeEach(() => {
    broadcaster = new TestBroadcaster();
  });

  describe('on', () => {
    it('should register event handlers', async () => {
      // arrange
      const handler = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      const payload = { data: 'test' };

      // act
      broadcaster.on('event1', handler);
      broadcaster.on('event1', handler2);
      broadcaster.on('event2', handler3);

      // assert
      await broadcaster.emit('event1', payload);

      expect(handler).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
      expect(handler3).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should unregister event handlers', async () => {
      // arrange
      const handler = jest.fn();
      const payload = { data: 'test' };

      broadcaster.on('event1', handler);

      // act
      const result = broadcaster.off('event1', handler);

      // assert
      await broadcaster.emit('event1', payload);
      expect(result).toBe(true);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return false if handler was not registered', () => {
      // arrange
      const handler = jest.fn();

      // act
      const result = broadcaster.off('event1', handler);

      // assert
      expect(result).toBe(false);
    });
  });
});
