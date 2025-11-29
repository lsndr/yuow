import {
  AsyncEventEmitter,
  type AsyncEventEmitterEvents,
} from './async-event-emitter';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, it, expect, vi } from 'vitest';

export interface TestBroadcasterEvents extends AsyncEventEmitterEvents {
  event1: [string, number];
  event2: [];
}

describe(AsyncEventEmitter, () => {
  let emitter: AsyncEventEmitter<TestBroadcasterEvents>;

  beforeEach(() => {
    emitter = new AsyncEventEmitter();
  });

  describe('on', () => {
    it('should register event handlers', async () => {
      // arrange
      const handler = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      const payload = [faker.word.sample(), faker.number.float()] as const;

      // act
      emitter.on('event1', handler);
      emitter.on('event1', handler2);
      emitter.on('event2', handler3);

      // assert
      await emitter.emit('event1', ...payload);

      expect(handler).toHaveBeenCalledExactlyOnceWith(...payload);
      expect(handler2).toHaveBeenCalledExactlyOnceWith(...payload);
      expect(handler3).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should unregister event handlers', async () => {
      // arrange
      const handler = vi.fn();
      const payload = ['test', 1] as const;

      emitter.on('event1', handler);

      // act
      const result = emitter.off('event1', handler);

      // assert
      await emitter.emit('event1', ...payload);
      expect(result).toBe(true);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return false if handler was not registered', () => {
      // arrange
      const handler = vi.fn();

      // act
      const result = emitter.off('event1', handler);

      // assert
      expect(result).toBe(false);
    });
  });
});
