import { Uow } from '../../src/core';
import { EngineMock } from './utils/engine.mock';
import { TransactionMock } from './utils/transaction.mock';

describe('Unit of Work', () => {
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
});
