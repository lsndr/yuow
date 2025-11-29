import { Context } from './context';
import { PersistenceError } from './persistence.error';
import { RunError } from './run-error';
import { Uow } from './uow';
import { EngineMock } from '../../tests/.config/engine.mock';
import { TransactionMock } from '../../tests/.config/transaction.mock';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, it, expect, vi } from 'vitest';

describe(Uow, () => {
  let transaction: TransactionMock;
  let engine: EngineMock;
  let uow: Uow<EngineMock>;

  beforeEach(() => {
    transaction = new TransactionMock();
    engine = new EngineMock(transaction);
    uow = new Uow(engine);
  });

  describe('run', () => {
    it('should propagate a result', async () => {
      // arrange
      const unitResult = faker.hacker.phrase();
      const unit = vi.fn().mockResolvedValue(unitResult);

      // act
      const result = await uow.run(unit);

      // assert
      expect(result).toBe(unitResult);
      expect(unit).toHaveBeenCalledExactlyOnceWith(expect.any(Context));
      expect(unit.mock.calls[0]?.[0].transaction).toBe(transaction);
    });

    it('should propagate an error', async () => {
      // arrange
      const error = new Error(`Error: ${faker.hacker.phrase()}`);
      const unit = () => {
        throw error;
      };

      // act
      const act = () => uow.run(unit);

      // assert
      await expect(act).rejects.toThrow(error);
    });

    it('should fail after 3 attempts by default', async () => {
      // arrange
      const error = new PersistenceError(
        'Repository',
        faker.string.uuid(),
        'insert',
      );
      const unit = vi.fn().mockRejectedValue(error);

      // act
      const act = () => uow.run(unit);

      // assert
      await expect(act).rejects.toThrow(new RunError([error, error, error]));
      expect(unit).toHaveBeenCalledTimes(3);
    });

    it.each([1, 5, 10])(
      'should should fail after %s attempts',
      async (attempts) => {
        // arrange
        const error = new PersistenceError(
          'Repository',
          faker.string.uuid(),
          'insert',
        );
        const unit = vi.fn().mockRejectedValue(error);

        // act
        const act = () => uow.run(unit, { attempts });

        // assert
        await expect(act).rejects.toThrow(
          new RunError(new Array(attempts).fill(error)),
        );
        expect(unit).toHaveBeenCalledTimes(attempts);
      },
    );

    it('should commit transaction if it was started', async () => {
      // arrange
      await transaction.begin();

      // act
      await uow.run(vi.fn());

      // assert
      expect(transaction.doCommit).toHaveBeenCalledTimes(1);
    });

    it('should not commit transaction if it was not started', async () => {
      // act
      await uow.run(vi.fn());

      // assert
      expect(transaction.doCommit).not.toHaveBeenCalled();
    });

    it('should rollback transaction if it was started and an error occurred', async () => {
      // arrange
      const error = new Error(`Error: ${faker.hacker.phrase()}`);
      await transaction.begin();

      // act
      const act = () =>
        uow.run(() => {
          throw error;
        });

      // assert
      await expect(act).rejects.toThrow(error);
      expect(transaction.doRollback).toHaveBeenCalledTimes(1);
    });

    it('should not rollback transaction if it was not started and an error occurred', async () => {
      // arrange
      const error = new Error(`Error: ${faker.hacker.phrase()}`);

      // act
      const act = () =>
        uow.run(() => {
          throw error;
        });

      // assert
      await expect(act).rejects.toThrow(error);
      expect(transaction.doRollback).not.toHaveBeenCalled();
    });

    it('should emit beforeRun and afterRun events', async () => {
      // arrange
      const beforeRun = vi.fn();
      const afterRun = vi.fn();
      uow.on('beforeRun', beforeRun);
      uow.on('afterRun', afterRun);

      // act
      await uow.run(vi.fn());

      // assert
      expect(beforeRun).toHaveBeenCalledExactlyOnceWith(expect.any(Context), {
        attempt: 1,
      });
      expect(afterRun).toHaveBeenCalledExactlyOnceWith(expect.any(Context), {
        attempt: 1,
      });
    });

    it('should emit beforeRun and afterRun events when error occur', async () => {
      // arrange
      const beforeRun = vi.fn();
      const afterRun = vi.fn();
      const error = new Error(`Error: ${faker.hacker.phrase()}`);

      uow.on('beforeRun', beforeRun);
      uow.on('afterRun', afterRun);

      // act
      const act = () =>
        uow.run(() => {
          throw error;
        });

      // assert
      await expect(act).rejects.toThrow(error);
      expect(beforeRun).toHaveBeenCalledExactlyOnceWith(expect.any(Context), {
        attempt: 1,
      });
      expect(afterRun).toHaveBeenCalledExactlyOnceWith(expect.any(Context), {
        error,
        attempt: 1,
      });
    });
  });
});
