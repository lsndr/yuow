import { Uow } from '../../src/core';
import { EngineMock } from './utils/engine.mock';
import { TransactionMock } from './utils/transaction.mock';
import 'jest-extended';

describe('Core – Unit of Work', () => {
  let engineMock: EngineMock;
  let transactionMock: TransactionMock;
  let uow: Uow<EngineMock>;

  beforeEach(async () => {
    transactionMock = new TransactionMock();
    engineMock = new EngineMock(transactionMock);

    uow = new Uow(engineMock);
  });

  it('should propagate an error', async () => {
    let attempts = 0;

    const action = () =>
      uow.run(() => {
        attempts++;
        throw new Error('Test error');
      });

    await expect(action).rejects.toThrow(new Error('Test error'));
    expect(attempts).toBe(1);
  });

  it('should propagate a result', async () => {
    const result = await uow.run(() => {
      return 'test result';
    });

    expect(result).toBe('test result');
  });

  it('should emit run events', async () => {
    // arrange
    const onBeforeRun = jest.fn();
    const onAfterRun = jest.fn();
    uow.on('beforeRun', onBeforeRun);
    uow.on('afterRun', onAfterRun);

    // act
    const context = await uow.run((ctx) => {
      return ctx;
    });

    // assert
    expect(onBeforeRun).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        context,
        attempt: 1,
      }),
    );
    expect(onAfterRun).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        context,
        attempt: 1,
      }),
    );
    expect(onBeforeRun).toHaveBeenCalledBefore(onAfterRun);
  });

  it('should not emit run events if unsubscribed', async () => {
    // arrange
    const onBeforeRun = jest.fn();
    const onAfterRun = jest.fn();
    uow.on('beforeRun', onBeforeRun);
    uow.on('afterRun', onAfterRun);
    uow.off('beforeRun', onBeforeRun);
    uow.off('afterRun', onAfterRun);

    // act
    await uow.run((ctx) => {
      return ctx;
    });

    // assert
    expect(onBeforeRun).not.toHaveBeenCalled();
    expect(onAfterRun).not.toHaveBeenCalled();
  });
});
