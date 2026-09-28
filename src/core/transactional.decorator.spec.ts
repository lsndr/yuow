import { Context } from './context';
import { Transactional } from './transactional.decorator';
import { Uow } from './uow';
import { UowContext } from './uow-context';
import { EngineMock } from '../../tests/.config/engine.mock';
import { TransactionMock } from '../../tests/.config/transaction.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe(Transactional, () => {
  let transaction: TransactionMock;
  let engine: EngineMock;
  let uow: Uow<EngineMock>;

  beforeEach(() => {
    transaction = new TransactionMock();
    engine = new EngineMock(transaction);
    uow = new Uow(engine);
  });

  it('should preserve `this` inside the decorated method', async () => {
    // arrange
    class Service {
      public readonly value = 'expected-value';

      @Transactional()
      public getValue(): Promise<string> {
        return Promise.resolve(this.value);
      }
    }

    const service = new Service();

    // act
    const result = await UowContext.create(uow, () => service.getValue());

    // assert
    expect(result).toBe('expected-value');
  });

  it('should reuse the same transaction for nested calls', async () => {
    // arrange
    const contexts: Context<TransactionMock>[] = [];

    class Service {
      @Transactional()
      public async outer(): Promise<void> {
        contexts.push(Context.get());

        await this.inner();
      }

      @Transactional()
      public inner(): Promise<void> {
        contexts.push(Context.get());

        return Promise.resolve();
      }
    }

    const service = new Service();
    const createTransactionSpy = vi.spyOn(engine, 'createTransaction');

    // act
    await UowContext.create(uow, () => service.outer());

    // assert
    expect(createTransactionSpy).toHaveBeenCalledTimes(1);
    expect(contexts).toHaveLength(2);
    expect(contexts[0]).toBe(contexts[1]);
  });
});
