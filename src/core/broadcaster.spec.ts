import type { AsyncEventEmitterEvents } from './async-event-emitter';
import { Broadcaster } from './broadcaster';
import { beforeEach, describe, it, expect, vi } from 'vitest';

interface TestBroadcasterEvents extends AsyncEventEmitterEvents {
  event: [unknown];
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
      const handler = vi.fn();
      const payload = { data: 'test' };

      // act
      broadcaster.on('event', handler);

      // assert
      await broadcaster.emit('event', payload);
      expect(handler).toHaveBeenCalledExactlyOnceWith(payload);
    });
  });

  describe('off', () => {
    it('should unregister event handler', async () => {
      // arrange
      const handler = vi.fn();
      const payload = { data: 'test' };

      broadcaster.on('event', handler);

      // act
      const result = broadcaster.off('event', handler);

      // assert
      await broadcaster.emit('event', payload);
      expect(result).toBe(true);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
