import {
  AsyncEventEmitter,
  type AsyncEventEmitterEvents,
} from './async-event-emitter';
import { faker } from '@faker-js/faker';
import 'jest-extended';

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
      const handler = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
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
      const handler = jest.fn();
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
      const handler = jest.fn();

      // act
      const result = emitter.off('event1', handler);

      // assert
      expect(result).toBe(false);
    });
  });
});
